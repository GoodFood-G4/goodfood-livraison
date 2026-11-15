import { ApiProperty } from '@nestjs/swagger';
import { toUtcIsoSeconds } from '../../../shared/application/utc-date-format';
import { Address } from '../../domain/address';

export class AddressResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() country!: string;
  @ApiProperty() street!: string;
  @ApiProperty({ name: 'postal_code' }) postal_code!: string;
  @ApiProperty() city!: string;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiProperty({ nullable: true }) created_by!: string | null;
  @ApiProperty({ name: 'created_at', example: '2026-11-11T21:55:25Z' })
  created_at!: string;

  static fromDomain(address: Address): AddressResponseDto {
    const dto = new AddressResponseDto();
    dto.id = address.id;
    dto.country = address.country;
    dto.street = address.street;
    dto.postal_code = address.postalCode;
    dto.city = address.city;
    dto.latitude = address.location.latitude;
    dto.longitude = address.location.longitude;
    dto.created_by = address.createdBy;
    dto.created_at = toUtcIsoSeconds(address.createdAt);
    return dto;
  }
}
