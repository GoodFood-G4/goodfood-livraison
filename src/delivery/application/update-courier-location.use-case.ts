import { Inject, Injectable } from '@nestjs/common';
import { GeoPoint } from '../../shared/domain/geo-point';
import { Clock, CLOCK } from '../../shared/application/ports/clock.port';
import {
  DeliveryRepository,
  DELIVERY_REPOSITORY,
} from '../domain/delivery-repository.port';
import { DeliveryNotFoundError } from '../domain/errors';

export interface UpdateCourierLocationInput {
  readonly deliveryId: string;
  readonly courierId: string;
  readonly latitude: number;
  readonly longitude: number;
}

@Injectable()
export class UpdateCourierLocationUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: UpdateCourierLocationInput): Promise<void> {
    const delivery = await this.deliveryRepository.findById(input.deliveryId);
    if (!delivery) {
      throw new DeliveryNotFoundError(input.deliveryId);
    }

    const location = GeoPoint.create(input.latitude, input.longitude);
    delivery.updateLocation(input.courierId, location, this.clock.now());

    await this.deliveryRepository.save(delivery);
  }
}
