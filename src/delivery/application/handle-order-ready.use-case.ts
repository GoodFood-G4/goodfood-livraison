import { Inject, Injectable } from '@nestjs/common';
import { CreateAddressUseCase } from '../../address/application/create-address.use-case';
import { Delivery } from '../domain/delivery';
import {
  DeliveryRepository,
  DELIVERY_REPOSITORY,
} from '../domain/delivery-repository.port';
import { CreateDeliveryUseCase } from './create-delivery.use-case';

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
 * Orchestration du flux order.ready -> adresses -> livraison. Réutilise les
 * use cases CreateAddress (géocodage si besoin) et CreateDelivery plutôt que de
 * dupliquer leurs règles.
 */
@Injectable()
export class HandleOrderReadyUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
    private readonly createAddressUseCase: CreateAddressUseCase,
    private readonly createDeliveryUseCase: CreateDeliveryUseCase,
  ) {}

  async execute(input: HandleOrderReadyInput): Promise<HandleOrderReadyResult> {
    const existing = await this.deliveryRepository.findByOrderId(input.orderId);
    if (existing) {
      return { created: false, delivery: null };
    }

    const destinationAddress = await this.createAddressUseCase.execute({
      ...input.deliveryAddress,
      createdBy: input.userId,
    });

    const pickupAddress = await this.createAddressUseCase.execute({
      ...input.pickupAddress,
      createdBy: null,
    });

    const delivery = await this.createDeliveryUseCase.execute({
      orderId: input.orderId,
      customerId: input.userId,
      franchiseId: input.franchiseId,
      destinationAddressId: destinationAddress.id,
      pickupAddressId: pickupAddress.id,
    });

    return { created: true, delivery };
  }
}
