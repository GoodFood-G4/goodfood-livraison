import { Inject, Injectable } from '@nestjs/common';
import { Clock, CLOCK } from '../../shared/application/ports/clock.port';
import {
  IdGenerator,
  ID_GENERATOR,
} from '../../shared/application/ports/id-generator.port';
import { Delivery } from '../domain/delivery';
import {
  DeliveryRepository,
  DELIVERY_REPOSITORY,
} from '../domain/delivery-repository.port';
import { DuplicateOrderError } from '../domain/errors';

export interface CreateDeliveryInput {
  readonly orderId: string;
  readonly customerId: string | null;
  readonly franchiseId: string | null;
  readonly destinationAddressId: string;
  readonly pickupAddressId: string | null;
}

@Injectable()
export class CreateDeliveryUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: CreateDeliveryInput): Promise<Delivery> {
    const existing = await this.deliveryRepository.findByOrderId(input.orderId);
    if (existing) {
      throw new DuplicateOrderError(input.orderId);
    }

    const delivery = Delivery.create({
      id: this.idGenerator.generate(),
      orderId: input.orderId,
      customerId: input.customerId,
      franchiseId: input.franchiseId,
      destinationAddressId: input.destinationAddressId,
      pickupAddressId: input.pickupAddressId,
      createdAt: this.clock.now(),
    });

    await this.deliveryRepository.save(delivery);

    return delivery;
  }
}
