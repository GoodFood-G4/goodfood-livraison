import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { RABBITMQ_CHANNEL_WRAPPER } from '../../../shared/infrastructure/messaging/rabbitmq.tokens';
import {
  HandleOrderReadyUseCase,
  OrderReadyAddressInput,
} from '../../application/handle-order-ready.use-case';
import { AddressNotGeocodableError } from '../../../address/domain/errors';
import { DuplicateOrderError } from '../../domain/errors';
import { QUEUE_NAME } from './routing-keys';
import { isTransientInfrastructureError } from './transient-error';
import {
  OrderReadyAddressSnapshotDto,
  OrderReadyMessageDto,
} from './order-ready-message.dto';

/** Délai avant remise en file, pour ne pas reboucler en continu (aligné sur Commande et Paiement). */
export const REQUEUE_DELAY_MS = 2000;

/**
 * Règles de consommation de `order.ready` :
 * - message invalide (JSON cassé, champ obligatoire absent ou mal typé) ou adresse non
 *   géocodable : `nack` sans requeue → `livraison.dlq` (policy `livraison-dlx` de goodfood-infra) ;
 * - erreur d'infrastructure transitoire (base indisponible, connexion perdue, timeout) :
 *   `nack` avec requeue après REQUEUE_DELAY_MS, une seule fois : si le message est déjà
 *   `redelivered`, il part en DLQ au lieu d'être remis en file encore ;
 * - toute autre erreur (TypeError, bug) : `nack` sans requeue → DLQ, log ERROR.
 */
@Injectable()
export class OrderReadyConsumer implements OnModuleInit {
  private readonly logger = new Logger(OrderReadyConsumer.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL_WRAPPER)
    private readonly channelWrapper: ChannelWrapper,
    private readonly handleOrderReadyUseCase: HandleOrderReadyUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.consume(QUEUE_NAME, (message) =>
        this.handleMessage(channel, message),
      );
    });
  }

  private async handleMessage(
    channel: ConfirmChannel,
    message: ConsumeMessage | null,
  ): Promise<void> {
    if (!message) {
      return;
    }

    const payload = await this.parseAndValidate(message).catch(
      (error: Error) => {
        this.logger.warn(
          `Message order.ready non validable, rejeté sans requeue : ${error.message}`,
        );
        return null;
      },
    );
    if (!payload) {
      channel.nack(message, false, false);
      return;
    }

    try {
      const result = await this.handleOrderReadyUseCase.execute({
        orderId: payload.order_id,
        userId: payload.user_id,
        franchiseId: payload.franchise_id,
        deliveryAddress: this.toAddressInput(payload.delivery_address),
        pickupAddress: this.toAddressInput(payload.pickup_address),
      });

      if (result.created && result.delivery) {
        this.logger.log(
          `Livraison créée : order_id=${payload.order_id}, delivery_id=${result.delivery.id}`,
        );
      } else {
        this.logger.log(
          `order.ready ignoré (idempotence) : livraison déjà existante pour order_id=${payload.order_id}`,
        );
      }
      channel.ack(message);
    } catch (error) {
      await this.handleProcessingError(
        channel,
        message,
        payload.order_id,
        error as Error,
      );
    }
  }

  private async parseAndValidate(
    message: ConsumeMessage,
  ): Promise<OrderReadyMessageDto | null> {
    let raw: unknown;
    try {
      raw = JSON.parse(message.content.toString());
    } catch {
      this.logger.warn(
        'Message order.ready illisible (JSON invalide), rejeté sans requeue',
      );
      return null;
    }

    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      this.logger.warn(
        'Message order.ready invalide (objet JSON attendu), rejeté sans requeue',
      );
      return null;
    }

    const dto = plainToInstance(OrderReadyMessageDto, raw);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      this.logger.warn(
        `Message order.ready invalide, rejeté sans requeue : ${errors.map((e) => e.property).join(', ')}`,
      );
      return null;
    }

    return dto;
  }

  private async handleProcessingError(
    channel: ConfirmChannel,
    message: ConsumeMessage,
    orderId: string,
    error: Error,
  ): Promise<void> {
    if (error instanceof DuplicateOrderError) {
      // Course entre deux messages pour le même order_id : l'autre a déjà créé
      // la livraison entre-temps, on acquitte sans erreur.
      this.logger.log(
        `order.ready : livraison créée entre-temps pour order_id=${orderId}, ack`,
      );
      channel.ack(message);
      return;
    }

    if (error instanceof AddressNotGeocodableError) {
      this.logger.warn(
        `order.ready rejeté (order_id=${orderId}) : adresse non géocodable, sans requeue`,
      );
      // Routé vers livraison.dlq par la policy livraison-dlx (goodfood-infra).
      channel.nack(message, false, false);
      return;
    }

    if (!isTransientInfrastructureError(error)) {
      this.logger.error(
        `Erreur inattendue sur order.ready (order_id=${orderId}), rejeté sans requeue vers livraison.dlq : ${error.message}`,
      );
      channel.nack(message, false, false);
      return;
    }

    if (message.fields?.redelivered) {
      // Garde-fou anti-boucle : déjà remis en file une fois, l'erreur persiste.
      this.logger.error(
        `Erreur transitoire persistante sur order.ready déjà redélivré (order_id=${orderId}), rejeté sans requeue vers livraison.dlq : ${error.message}`,
      );
      channel.nack(message, false, false);
      return;
    }

    this.logger.warn(
      `Erreur transitoire sur order.ready (order_id=${orderId}), remis en file dans ${REQUEUE_DELAY_MS} ms : ${error.message}`,
    );
    await new Promise((resolve) => setTimeout(resolve, REQUEUE_DELAY_MS));
    channel.nack(message, false, true);
  }

  private toAddressInput(
    dto: OrderReadyAddressSnapshotDto,
  ): OrderReadyAddressInput {
    return {
      country: dto.country,
      street: dto.street,
      postalCode: dto.postal_code,
      city: dto.city,
      latitude: dto.latitude,
      longitude: dto.longitude,
    };
  }
}
