import { Inject, Injectable } from '@nestjs/common';
import { Actor, Role } from '../../shared/application/actor';
import { Address } from '../../address/domain/address';
import {
  AddressRepository,
  ADDRESS_REPOSITORY,
} from '../../address/domain/address-repository.port';
import { Delivery } from '../domain/delivery';
import { EtaCalculator } from '../domain/eta-calculator';
import {
  DeliveryRepository,
  DELIVERY_REPOSITORY,
} from '../domain/delivery-repository.port';
import { DeliveryNotFoundError } from '../domain/errors';
import { AVERAGE_COURIER_SPEED_KMH } from './config-tokens';

export interface GetDeliveryInput {
  readonly deliveryId: string;
  readonly actor: Actor;
}

export interface DeliveryDetails {
  readonly delivery: Delivery;
  readonly pickupAddress: Address | null;
  readonly destinationAddress: Address;
  readonly etaMinutes: number | null;
}

@Injectable()
export class GetDeliveryUseCase {
  private readonly etaCalculator = new EtaCalculator();

  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
    @Inject(ADDRESS_REPOSITORY)
    private readonly addressRepository: AddressRepository,
    @Inject(AVERAGE_COURIER_SPEED_KMH) private readonly averageSpeedKmh: number,
  ) {}

  async execute(input: GetDeliveryInput): Promise<DeliveryDetails> {
    const delivery = await this.deliveryRepository.findById(input.deliveryId);
    if (!delivery) {
      throw new DeliveryNotFoundError(input.deliveryId);
    }

    this.assertCanView(delivery, input.actor);

    const [pickupAddress, destinationAddress] = await Promise.all([
      delivery.pickupAddressId
        ? this.addressRepository.findById(delivery.pickupAddressId)
        : Promise.resolve(null),
      this.addressRepository.findById(delivery.destinationAddressId),
    ]);

    if (!destinationAddress) {
      throw new DeliveryNotFoundError(input.deliveryId);
    }

    const etaMinutes = this.etaCalculator.calculate({
      status: delivery.status,
      courierLocation: delivery.courierLocation,
      pickupLocation: pickupAddress?.location ?? null,
      destinationLocation: destinationAddress.location,
      averageSpeedKmh: this.averageSpeedKmh,
    });

    return { delivery, pickupAddress, destinationAddress, etaMinutes };
  }

  private assertCanView(delivery: Delivery, actor: Actor): void {
    if (actor.role === Role.ADMIN) {
      // TODO: restreindre à sa propre franchise quand le JWT portera un claim franchise_id.
      return;
    }
    if (actor.role === Role.CUSTOMER && delivery.customerId === actor.userId) {
      return;
    }
    if (actor.role === Role.COURIER && delivery.courierId === actor.userId) {
      return;
    }
    // Livraison d'un autre utilisateur : 404, on ne révèle pas son existence.
    throw new DeliveryNotFoundError(delivery.id);
  }
}
