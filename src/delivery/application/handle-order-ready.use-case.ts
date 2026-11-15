import { Inject, Injectable } from '@nestjs/common';
import { Address } from '../../address/domain/address';
import { Geocoder, GEOCODER } from '../../address/domain/geocoder.port';
import { resolveAddressLocation } from '../../address/application/resolve-address-location';
import { GeoPoint } from '../../shared/domain/geo-point';
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
import { UnitOfWork, UNIT_OF_WORK } from './unit-of-work.port';

export interface OrderReadyAddressInput {
  readonly country: string;
  readonly street: string;
  readonly postalCode: string;
  readonly city: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

export interface HandleOrderReadyInput {
  readonly orderId: string;
  readonly userId: string;
  readonly franchiseId: string;
  readonly deliveryAddress: OrderReadyAddressInput;
  readonly pickupAddress: OrderReadyAddressInput;
}

export interface HandleOrderReadyResult {
  readonly created: boolean;
  readonly delivery: Delivery | null;
}

/**
 * Flux order.ready -> adresses -> livraison, en deux temps :
 * 1. géocodage des adresses sans coordonnées, sans aucune écriture ;
 * 2. enregistrement des deux adresses et de la livraison dans UNE transaction.
 * Un échec à l'une ou l'autre étape ne laisse donc aucune ligne orpheline.
 */
@Injectable()
export class HandleOrderReadyUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
    @Inject(GEOCODER) private readonly geocoder: Geocoder,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: HandleOrderReadyInput): Promise<HandleOrderReadyResult> {
    // Pré-contrôle hors transaction : évite de géocoder pour un doublon.
    const existing = await this.deliveryRepository.findByOrderId(input.orderId);
    if (existing) {
      return { created: false, delivery: null };
    }

    const destinationLocation = await resolveAddressLocation(
      this.geocoder,
      input.deliveryAddress,
    );
    const pickupLocation = await resolveAddressLocation(
      this.geocoder,
      input.pickupAddress,
    );

    const now = this.clock.now();
    const destinationAddress = this.buildAddress(
      input.deliveryAddress,
      destinationLocation,
      input.userId,
      now,
    );
    const pickupAddress = this.buildAddress(
      input.pickupAddress,
      pickupLocation,
      null,
      now,
    );
    const delivery = Delivery.create({
      id: this.idGenerator.generate(),
      orderId: input.orderId,
      customerId: input.userId,
      franchiseId: input.franchiseId,
      destinationAddressId: destinationAddress.id,
      pickupAddressId: pickupAddress.id,
      createdAt: now,
    });

    await this.unitOfWork.run(async ({ addresses, deliveries }) => {
      // Re-contrôle dans la transaction : un autre message a pu créer la
      // livraison pendant le géocodage.
      if (await deliveries.findByOrderId(input.orderId)) {
        throw new DuplicateOrderError(input.orderId);
      }
      await addresses.save(destinationAddress);
      await addresses.save(pickupAddress);
      await deliveries.save(delivery);
    });

    return { created: true, delivery };
  }

  private buildAddress(
    input: OrderReadyAddressInput,
    location: GeoPoint,
    createdBy: string | null,
    createdAt: Date,
  ): Address {
    return Address.create({
      id: this.idGenerator.generate(),
      country: input.country,
      street: input.street,
      postalCode: input.postalCode,
      city: input.city,
      location,
      createdBy,
      createdAt,
    });
  }
}
