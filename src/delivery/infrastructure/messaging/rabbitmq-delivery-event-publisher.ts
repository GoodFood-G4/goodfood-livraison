import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ChannelWrapper } from 'amqp-connection-manager';
import {
  DeliveryEventPayload,
  DeliveryEventPublisher,
} from '../../domain/delivery-event-publisher.port';
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
    await this.publish(DELIVERY_ASSIGNED_ROUTING_KEY, 'assigned', payload);
  }

  async publishPickedUp(payload: DeliveryEventPayload): Promise<void> {
    await this.publish(DELIVERY_PICKED_UP_ROUTING_KEY, 'picked_up', payload);
  }

  async publishStarted(payload: DeliveryEventPayload): Promise<void> {
    await this.publish(DELIVERY_STARTED_ROUTING_KEY, 'in_transit', payload);
  }

  async publishCompleted(payload: DeliveryEventPayload): Promise<void> {
    await this.publish(DELIVERY_COMPLETED_ROUTING_KEY, 'delivered', payload);
  }

  private async publish(
    routingKey: string,
    status: string,
    payload: DeliveryEventPayload,
  ): Promise<void> {
    const message = {
      delivery_id: payload.deliveryId,
      order_id: payload.orderId,
      customer_id: payload.customerId,
      courier_id: payload.courierId,
      status,
      occurred_at: payload.occurredAt.toISOString(),
    };

    try {
      await this.channelWrapper.publish(
        EXCHANGE_NAME,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true, contentType: 'application/json' },
      );
      this.logger.log(
        `Événement publié : ${routingKey} (delivery_id=${payload.deliveryId})`,
      );
    } catch (error) {
      this.logger.warn(
        `Échec de publication best-effort ${routingKey} (delivery_id=${payload.deliveryId}) : ${(error as Error).message}`,
      );
    }
  }
}
