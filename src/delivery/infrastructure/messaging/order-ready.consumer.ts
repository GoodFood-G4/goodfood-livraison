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
import {
  OrderReadyAddressSnapshotDto,
  OrderReadyMessageDto,
} from './order-ready-message.dto';

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

    const payload = await this.parseAndValidate(message);
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

      if (!result.created) {
        this.logger.log(
          `order.ready ignoré (idempotence) : livraison déjà existante pour order_id=${payload.order_id}`,
        );
      }
      channel.ack(message);
    } catch (error) {
      this.handleProcessingError(
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

  private handleProcessingError(
    channel: ConfirmChannel,
    message: ConsumeMessage,
    orderId: string,
    error: Error,
  ): void {
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
      // TODO: router vers une dead-letter queue une fois configurée dans goodfood-infra.
      channel.nack(message, false, false);
      return;
    }

    this.logger.error(
      `Erreur infrastructure lors du traitement de order.ready (order_id=${orderId}), requeue : ${error.message}`,
    );
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
