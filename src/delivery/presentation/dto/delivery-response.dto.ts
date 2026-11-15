import { ApiProperty } from '@nestjs/swagger';
import {
  toUtcIsoSeconds,
  toUtcIsoSecondsOrNull,
} from '../../../shared/application/utc-date-format';
import { Delivery } from '../../domain/delivery';

const DATE_EXAMPLE = '2026-11-11T21:55:25Z';

/**
 * Horodatages du cycle de vie, identiques aux dates des événements delivery.*
 * (null tant que l'étape n'est pas atteinte). Format : UTC, à la seconde, Z.
 */
export class DeliveryTimestampsDto {
  @ApiProperty({ nullable: true, name: 'assigned_at', example: DATE_EXAMPLE })
  assigned_at!: string | null;
  @ApiProperty({ nullable: true, name: 'picked_up_at', example: DATE_EXAMPLE })
  picked_up_at!: string | null;
  @ApiProperty({ nullable: true, name: 'started_at', example: DATE_EXAMPLE })
  started_at!: string | null;
  @ApiProperty({ nullable: true, name: 'completed_at', example: DATE_EXAMPLE })
  completed_at!: string | null;
  @ApiProperty({
    nullable: true,
    name: 'accepted_at',
    deprecated: true,
    description: 'Alias historique de assigned_at',
  })
  accepted_at!: string | null;
  @ApiProperty({
    nullable: true,
    name: 'delivered_at',
    deprecated: true,
    description: 'Alias historique de completed_at',
  })
  delivered_at!: string | null;
  @ApiProperty({ name: 'created_at', example: DATE_EXAMPLE })
  created_at!: string;
  @ApiProperty({ name: 'updated_at', example: DATE_EXAMPLE })
  updated_at!: string;

  static assign<T extends DeliveryTimestampsDto>(
    dto: T,
    delivery: Delivery,
  ): T {
    dto.assigned_at = toUtcIsoSecondsOrNull(delivery.acceptedAt);
    dto.picked_up_at = toUtcIsoSecondsOrNull(delivery.pickedUpAt);
    dto.started_at = toUtcIsoSecondsOrNull(delivery.startedAt);
    dto.completed_at = toUtcIsoSecondsOrNull(delivery.deliveredAt);
    dto.accepted_at = dto.assigned_at;
    dto.delivered_at = dto.completed_at;
    dto.created_at = toUtcIsoSeconds(delivery.createdAt);
    dto.updated_at = toUtcIsoSeconds(delivery.updatedAt);
    return dto;
  }
}

export class DeliveryResponseDto extends DeliveryTimestampsDto {
  @ApiProperty() id!: string;
  @ApiProperty({ name: 'order_id' }) order_id!: string;
  @ApiProperty({ nullable: true, name: 'customer_id' }) customer_id!:
    string | null;
  @ApiProperty({ nullable: true, name: 'franchise_id' }) franchise_id!:
    string | null;
  @ApiProperty({ name: 'destination_address_id' })
  destination_address_id!: string;
  @ApiProperty({ nullable: true, name: 'pickup_address_id' })
  pickup_address_id!: string | null;
  @ApiProperty({ example: 'pending' }) status!: string;
  @ApiProperty({ nullable: true, name: 'courier_id' }) courier_id!:
    string | null;

  static fromDomain(delivery: Delivery): DeliveryResponseDto {
    const dto = new DeliveryResponseDto();
    dto.id = delivery.id;
    dto.order_id = delivery.orderId;
    dto.customer_id = delivery.customerId;
    dto.franchise_id = delivery.franchiseId;
    dto.destination_address_id = delivery.destinationAddressId;
    dto.pickup_address_id = delivery.pickupAddressId;
    dto.status = delivery.status;
    dto.courier_id = delivery.courierId;
    return DeliveryTimestampsDto.assign(dto, delivery);
  }
}
