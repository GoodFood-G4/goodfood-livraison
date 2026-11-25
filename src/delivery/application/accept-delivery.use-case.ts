import { Inject, Injectable } from '@nestjs/common';
import { Clock, CLOCK } from '../../shared/application/ports/clock.port';
import { Delivery } from '../domain/delivery';
import {
  DeliveryRepository,
  DELIVERY_REPOSITORY,
} from '../domain/delivery-repository.port';
import {
  DeliveryEventPublisher,
  DELIVERY_EVENT_PUBLISHER,
} from '../domain/delivery-event-publisher.port';
import { CourierBusyError, DeliveryNotFoundError } from '../domain/errors';
import { MAX_ACTIVE_DELIVERIES_PER_COURIER } from './config-tokens';

export interface AcceptDeliveryInput {
  readonly deliveryId: string;
  readonly courierId: string;
}

@Injectable()
export class AcceptDeliveryUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
    @Inject(DELIVERY_EVENT_PUBLISHER)
    private readonly eventPublisher: DeliveryEventPublisher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAX_ACTIVE_DELIVERIES_PER_COURIER)
    private readonly maxActiveDeliveries: number,
  ) {}

  async execute(input: AcceptDeliveryInput): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findById(input.deliveryId);
    if (!delivery) {
      throw new DeliveryNotFoundError(input.deliveryId);
    }

    const activeCount = await this.deliveryRepository.countActiveForCourier(
      input.courierId,
    );
    if (activeCount >= this.maxActiveDeliveries) {
      throw new CourierBusyError(this.maxActiveDeliveries);
    }

    delivery.accept(input.courierId, this.clock.now());

    // Le verrou optimiste (version) tranche la course simultanée côté persistance :
    // un save() en conflit est traduit en DeliveryAlreadyAssignedError par l'adaptateur.
    await this.deliveryRepository.save(delivery);

    await this.eventPublisher.publishAssigned({
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      customerId: delivery.customerId,
      courierId: delivery.courierId,
      // Exactement la date stockée (assigned_at exposé par GET /deliveries/:id).
      occurredAt: delivery.acceptedAt as Date,
    });

    return delivery;
  }
}
