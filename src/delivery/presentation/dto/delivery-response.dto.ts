import { ApiProperty } from '@nestjs/swagger';
import { Delivery } from '../../domain/delivery';

export class DeliveryResponseDto {
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
  @ApiProperty({ nullable: true, name: 'accepted_at' }) accepted_at!:
    string | null;
  @ApiProperty({ nullable: true, name: 'picked_up_at' }) picked_up_at!:
    string | null;
  @ApiProperty({ nullable: true, name: 'delivered_at' }) delivered_at!:
    string | null;
  @ApiProperty({ name: 'created_at' }) created_at!: string;
  @ApiProperty({ name: 'updated_at' }) updated_at!: string;

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
    dto.accepted_at = delivery.acceptedAt?.toISOString() ?? null;
    dto.picked_up_at = delivery.pickedUpAt?.toISOString() ?? null;
    dto.delivered_at = delivery.deliveredAt?.toISOString() ?? null;
    dto.created_at = delivery.createdAt.toISOString();
    dto.updated_at = delivery.updatedAt.toISOString();
    return dto;
  }
}
