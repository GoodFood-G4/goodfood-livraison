import { ApiProperty } from '@nestjs/swagger';
import { AvailableDeliveryResult } from '../../domain/delivery-repository.port';
import { DeliveryResponseDto } from './delivery-response.dto';

export class AvailableDeliveryResponseDto extends DeliveryResponseDto {
  @ApiProperty({ example: 2.4, name: 'distance_km' })
  distance_km!: number;

  static fromResult(
    result: AvailableDeliveryResult,
  ): AvailableDeliveryResponseDto {
    const base = DeliveryResponseDto.fromDomain(result.delivery);
    const dto = Object.assign(new AvailableDeliveryResponseDto(), base);
    dto.distance_km = Math.round(result.distanceKm * 100) / 100;
    return dto;
  }
}
