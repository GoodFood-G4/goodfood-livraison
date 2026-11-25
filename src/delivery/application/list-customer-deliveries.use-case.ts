import { Inject, Injectable } from '@nestjs/common';
import { Paginated } from '../../shared/application/paginated';
import { Delivery } from '../domain/delivery';
import {
  DeliveryRepository,
  DELIVERY_REPOSITORY,
} from '../domain/delivery-repository.port';

export interface ListCustomerDeliveriesInput {
  readonly customerId: string;
  readonly page: number;
  readonly limit: number;
}

/**
 * Livraisons du client connecté, pour qu'il retrouve son suivi sans saisir
 * l'identifiant de livraison. Seules les siennes (`customer_id`) sont renvoyées.
 */
@Injectable()
export class ListCustomerDeliveriesUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
  ) {}

  async execute(
    input: ListCustomerDeliveriesInput,
  ): Promise<Paginated<Delivery>> {
    return this.deliveryRepository.findForCustomer(
      input.customerId,
      input.page,
      input.limit,
    );
  }
}
