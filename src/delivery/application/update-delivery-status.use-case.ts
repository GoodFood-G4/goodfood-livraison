import { Inject, Injectable } from '@nestjs/common';
import { Clock, CLOCK } from '../../shared/application/ports/clock.port';
import { Delivery } from '../domain/delivery';
import { DeliveryStatus } from '../domain/delivery-status';
import {
  DeliveryRepository,
  DELIVERY_REPOSITORY,
} from '../domain/delivery-repository.port';
import {
  DeliveryEventPayload,
  DeliveryEventPublisher,
  DELIVERY_EVENT_PUBLISHER,
} from '../domain/delivery-event-publisher.port';
import { DeliveryNotFoundError } from '../domain/errors';

export interface UpdateDeliveryStatusInput {
  readonly deliveryId: string;
  readonly courierId: string;
  readonly status: DeliveryStatus;
}

@Injectable()
export class UpdateDeliveryStatusUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
    @Inject(DELIVERY_EVENT_PUBLISHER)
    private readonly eventPublisher: DeliveryEventPublisher,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: UpdateDeliveryStatusInput): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findById(input.deliveryId);
    if (!delivery) {
      throw new DeliveryNotFoundError(input.deliveryId);
    }

    delivery.advanceTo(input.status, input.courierId, this.clock.now());

    await this.deliveryRepository.save(delivery);

    await this.publishForStatus(delivery);

    return delivery;
  }

  /**
   * La date de l'événement est celle stockée sur la livraison (picked_up_at,
   * started_at, completed_at exposés par GET /deliveries/:id).
   */
  private async publishForStatus(delivery: Delivery): Promise<void> {
    const payload = (occurredAt: Date | null): DeliveryEventPayload => ({
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      customerId: delivery.customerId,
      courierId: delivery.courierId,
      occurredAt: occurredAt as Date,
    });

    switch (delivery.status) {
      case DeliveryStatus.PICKED_UP:
        await this.eventPublisher.publishPickedUp(payload(delivery.pickedUpAt));
        return;
      case DeliveryStatus.IN_TRANSIT:
        await this.eventPublisher.publishStarted(payload(delivery.startedAt));
        return;
      case DeliveryStatus.DELIVERED:
        await this.eventPublisher.publishCompleted(
          payload(delivery.deliveredAt),
        );
        return;
      default:
        return;
    }
  }
}
