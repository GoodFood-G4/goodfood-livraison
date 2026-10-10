import { Inject, Injectable } from '@nestjs/common';
import { GeoPoint } from '../../shared/domain/geo-point';
import {
  AvailableDeliveryResult,
  DeliveryRepository,
  DELIVERY_REPOSITORY,
} from '../domain/delivery-repository.port';
import {
  DEFAULT_SEARCH_RADIUS_KM,
  MAX_SEARCH_RADIUS_KM,
} from './config-tokens';

export interface ListAvailableDeliveriesInput {
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusKm?: number;
}

@Injectable()
export class ListAvailableDeliveriesUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
    @Inject(DEFAULT_SEARCH_RADIUS_KM) private readonly defaultRadiusKm: number,
    @Inject(MAX_SEARCH_RADIUS_KM) private readonly maxRadiusKm: number,
  ) {}

  async execute(
    input: ListAvailableDeliveriesInput,
  ): Promise<AvailableDeliveryResult[]> {
    const center = GeoPoint.create(input.latitude, input.longitude);
    const requestedRadius = input.radiusKm ?? this.defaultRadiusKm;
    const effectiveRadius = Math.min(requestedRadius, this.maxRadiusKm);

    return this.deliveryRepository.findAvailableWithinRadius(
      center,
      effectiveRadius,
    );
  }
}
