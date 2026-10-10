import { Inject, Injectable } from '@nestjs/common';
import { Paginated } from '../../shared/application/paginated';
import { Delivery } from '../domain/delivery';
import {
  DeliveryRepository,
  DELIVERY_REPOSITORY,
} from '../domain/delivery-repository.port';

export interface ListCourierHistoryInput {
  readonly courierId: string;
  readonly page: number;
  readonly limit: number;
}

@Injectable()
export class ListCourierHistoryUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
  ) {}

  async execute(input: ListCourierHistoryInput): Promise<Paginated<Delivery>> {
    return this.deliveryRepository.findHistoryForCourier(
      input.courierId,
      input.page,
      input.limit,
    );
  }
}
