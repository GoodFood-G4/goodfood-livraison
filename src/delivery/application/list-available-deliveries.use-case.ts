import { Inject, Injectable } from '@nestjs/common';
import { Address } from '../../address/domain/address';
import {
  AddressRepository,
  ADDRESS_REPOSITORY,
} from '../../address/domain/address-repository.port';
import { GeoPoint } from '../../shared/domain/geo-point';
import { haversineDistanceKm } from '../../shared/domain/haversine';
import { Delivery } from '../domain/delivery';
import {
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

/**
 * Ce qu'un livreur voit d'une livraison avant de l'accepter : où retirer le repas
 * et la longueur de la course, mais jamais l'adresse du client (protection de ses
 * données tant qu'aucun livreur n'est assigné).
 */
export interface AvailableDeliveryOffer {
  readonly delivery: Delivery;
  /** Distance livreur → point de retrait (ou destination si pas de retrait). */
  readonly distanceKm: number;
  readonly pickupAddress: Address | null;
  /** Distance retrait → client, à vol d'oiseau ; null si pas de retrait connu. */
  readonly tripDistanceKm: number | null;
}

@Injectable()
export class ListAvailableDeliveriesUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
    @Inject(ADDRESS_REPOSITORY)
    private readonly addressRepository: AddressRepository,
    @Inject(DEFAULT_SEARCH_RADIUS_KM) private readonly defaultRadiusKm: number,
    @Inject(MAX_SEARCH_RADIUS_KM) private readonly maxRadiusKm: number,
  ) {}

  async execute(
    input: ListAvailableDeliveriesInput,
  ): Promise<AvailableDeliveryOffer[]> {
    const center = GeoPoint.create(input.latitude, input.longitude);
    const requestedRadius = input.radiusKm ?? this.defaultRadiusKm;
    const effectiveRadius = Math.min(requestedRadius, this.maxRadiusKm);

    const results = await this.deliveryRepository.findAvailableWithinRadius(
      center,
      effectiveRadius,
    );

    return Promise.all(
      results.map(async ({ delivery, distanceKm }) => {
        const [pickupAddress, destinationAddress] = await Promise.all([
          delivery.pickupAddressId
            ? this.addressRepository.findById(delivery.pickupAddressId)
            : Promise.resolve(null),
          this.addressRepository.findById(delivery.destinationAddressId),
        ]);
        const tripDistanceKm =
          pickupAddress && destinationAddress
            ? haversineDistanceKm(
                pickupAddress.location,
                destinationAddress.location,
              )
            : null;
        return { delivery, distanceKm, pickupAddress, tripDistanceKm };
      }),
    );
  }
}
