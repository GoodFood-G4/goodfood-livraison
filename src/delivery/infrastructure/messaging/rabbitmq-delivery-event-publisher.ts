import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ChannelWrapper } from 'amqp-connection-manager';
import {
  DeliveryEventPayload,
  DeliveryEventPublisher,
} from '../../domain/delivery-event-publisher.port';
import { toUtcIsoSeconds } from '../../../shared/application/utc-date-format';
import { RABBITMQ_CHANNEL_WRAPPER } from '../../../shared/infrastructure/messaging/rabbitmq.tokens';
import {
  DELIVERY_ASSIGNED_ROUTING_KEY,
  DELIVERY_COMPLETED_ROUTING_KEY,
  DELIVERY_PICKED_UP_ROUTING_KEY,
  DELIVERY_STARTED_ROUTING_KEY,
  EXCHANGE_NAME,
} from './routing-keys';

/**
 * Publication "best effort" : jamais de rejet de promesse pour une
 * indisponibilité de RabbitMQ, uniquement un log d'avertissement (TODO :
 * pattern outbox pour garantir la publication).
 */
@Injectable()
export class RabbitMqDeliveryEventPublisher implements DeliveryEventPublisher {
  private readonly logger = new Logger(RabbitMqDeliveryEventPublisher.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL_WRAPPER)
    private readonly channelWrapper: ChannelWrapper,
  ) {}

  async publishAssigned(payload: DeliveryEventPayload): Promise<void> {
    await this.publish(DELIVERY_ASSIGNED_ROUTING_KEY, 'assigned_at', payload);
  }

  async publishPickedUp(payload: DeliveryEventPayload): Promise<void> {
    await this.publish(DELIVERY_PICKED_UP_ROUTING_KEY, 'picked_up_at', payload);
  }

  async publishStarted(payload: DeliveryEventPayload): Promise<void> {
    await this.publish(DELIVERY_STARTED_ROUTING_KEY, 'started_at', payload);
  }

  async publishCompleted(payload: DeliveryEventPayload): Promise<void> {
    await this.publish(DELIVERY_COMPLETED_ROUTING_KEY, 'completed_at', payload);
  }

  private async publish(
    routingKey: string,
    dateField: string,
    payload: DeliveryEventPayload,
  ): Promise<void> {
    // Contrat goodfood.events : snake_case, date UTC à la seconde terminée par Z.
    const message = {
      delivery_id: payload.deliveryId,
      order_id: payload.orderId,
      courier_id: payload.courierId,
      [dateField]: toUtcIsoSeconds(payload.occurredAt),
    };

    try {
      await this.channelWrapper.publish(
        EXCHANGE_NAME,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true, contentType: 'application/json' },
      );
      this.logger.log(
        `Événement publié : ${routingKey} (delivery_id=${payload.deliveryId}, order_id=${payload.orderId})`,
      );
    } catch (error) {
      this.logger.warn(
        `Échec de publication best-effort ${routingKey} (delivery_id=${payload.deliveryId}) : ${(error as Error).message}`,
      );
    }
  }
}
