import { ApiProperty } from '@nestjs/swagger';
import { Address } from '../../../address/domain/address';
import { toUtcIsoSeconds } from '../../../shared/application/utc-date-format';
import { DeliveryDetails } from '../../application/get-delivery.use-case';
import { DeliveryTimestampsDto } from './delivery-response.dto';

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
  @ApiProperty({
    name: 'updated_at',
    example: '2026-11-11T21:55:25Z',
    description: 'Date de la dernière position reçue (UTC, à la seconde)',
  })
  updated_at!: string;
}

export class DeliveryDetailResponseDto extends DeliveryTimestampsDto {
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
    dto.courier_location =
      delivery.courierLocation && delivery.locationUpdatedAt
        ? {
            latitude: delivery.courierLocation.latitude,
            longitude: delivery.courierLocation.longitude,
            updated_at: toUtcIsoSeconds(delivery.locationUpdatedAt),
          }
        : null;
    dto.eta_minutes = details.etaMinutes;
    return DeliveryTimestampsDto.assign(dto, delivery);
  }
}
