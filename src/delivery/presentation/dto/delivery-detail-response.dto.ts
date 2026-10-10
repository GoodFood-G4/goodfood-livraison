import { ApiProperty } from '@nestjs/swagger';
import { Address } from '../../../address/domain/address';
import { DeliveryDetails } from '../../application/get-delivery.use-case';

class AddressSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() country!: string;
  @ApiProperty() street!: string;
  @ApiProperty({ name: 'postal_code' }) postal_code!: string;
  @ApiProperty() city!: string;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;

  static fromDomain(address: Address): AddressSummaryDto {
    const dto = new AddressSummaryDto();
    dto.id = address.id;
    dto.country = address.country;
    dto.street = address.street;
    dto.postal_code = address.postalCode;
    dto.city = address.city;
    dto.latitude = address.location.latitude;
    dto.longitude = address.location.longitude;
    return dto;
  }
}

class CourierLocationDto {
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
}

export class DeliveryDetailResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ name: 'order_id' }) order_id!: string;
  @ApiProperty({ nullable: true, name: 'customer_id' }) customer_id!:
    string | null;
  @ApiProperty({ nullable: true, name: 'franchise_id' }) franchise_id!:
    string | null;
  @ApiProperty({ example: 'in_transit' }) status!: string;
  @ApiProperty({ nullable: true, name: 'courier_id' }) courier_id!:
    string | null;
  @ApiProperty({
    type: AddressSummaryDto,
    nullable: true,
    name: 'pickup_address',
  })
  pickup_address!: AddressSummaryDto | null;
  @ApiProperty({ type: AddressSummaryDto, name: 'destination_address' })
  destination_address!: AddressSummaryDto;
  @ApiProperty({
    type: CourierLocationDto,
    nullable: true,
    name: 'courier_location',
  })
  courier_location!: CourierLocationDto | null;
  @ApiProperty({ nullable: true, name: 'eta_minutes' }) eta_minutes!:
    number | null;
  @ApiProperty({ nullable: true, name: 'accepted_at' }) accepted_at!:
    string | null;
  @ApiProperty({ nullable: true, name: 'picked_up_at' }) picked_up_at!:
    string | null;
  @ApiProperty({ nullable: true, name: 'delivered_at' }) delivered_at!:
    string | null;
  @ApiProperty({ name: 'created_at' }) created_at!: string;
  @ApiProperty({ name: 'updated_at' }) updated_at!: string;

  static fromDetails(details: DeliveryDetails): DeliveryDetailResponseDto {
    const { delivery } = details;
    const dto = new DeliveryDetailResponseDto();
    dto.id = delivery.id;
    dto.order_id = delivery.orderId;
    dto.customer_id = delivery.customerId;
    dto.franchise_id = delivery.franchiseId;
    dto.status = delivery.status;
    dto.courier_id = delivery.courierId;
    dto.pickup_address = details.pickupAddress
      ? AddressSummaryDto.fromDomain(details.pickupAddress)
      : null;
    dto.destination_address = AddressSummaryDto.fromDomain(
      details.destinationAddress,
    );
    dto.courier_location = delivery.courierLocation
      ? {
          latitude: delivery.courierLocation.latitude,
          longitude: delivery.courierLocation.longitude,
        }
      : null;
    dto.eta_minutes = details.etaMinutes;
    dto.accepted_at = delivery.acceptedAt?.toISOString() ?? null;
    dto.picked_up_at = delivery.pickedUpAt?.toISOString() ?? null;
    dto.delivered_at = delivery.deliveredAt?.toISOString() ?? null;
    dto.created_at = delivery.createdAt.toISOString();
    dto.updated_at = delivery.updatedAt.toISOString();
    return dto;
  }
}
