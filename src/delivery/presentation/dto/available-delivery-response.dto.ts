import { ApiProperty } from '@nestjs/swagger';
import { AvailableDeliveryOffer } from '../../application/list-available-deliveries.use-case';
import { AddressSummaryDto } from './delivery-detail-response.dto';
import { DeliveryResponseDto } from './delivery-response.dto';

const roundKm = (km: number): number => Math.round(km * 100) / 100;

/**
 * Livraison proposée à un livreur. L'adresse de retrait est complète ; l'adresse
 * du client n'est volontairement pas exposée (seulement la longueur de la course),
 * elle ne devient visible qu'après acceptation via GET /deliveries/:id.
 */
export class AvailableDeliveryResponseDto extends DeliveryResponseDto {
  @ApiProperty({
    example: 2.4,
    name: 'distance_km',
    description: 'Distance livreur → point de retrait',
  })
  distance_km!: number;

  @ApiProperty({
    type: AddressSummaryDto,
    nullable: true,
    name: 'pickup_address',
    description: 'Où retirer le repas',
  })
  pickup_address!: AddressSummaryDto | null;

  @ApiProperty({
    example: 1.8,
    nullable: true,
    name: 'trip_distance_km',
    description:
      "Distance retrait → client à vol d'oiseau (adresse client masquée)",
  })
  trip_distance_km!: number | null;

  static fromOffer(
    offer: AvailableDeliveryOffer,
  ): AvailableDeliveryResponseDto {
    const base = DeliveryResponseDto.fromDomain(offer.delivery);
    const dto = Object.assign(new AvailableDeliveryResponseDto(), base);
    dto.distance_km = roundKm(offer.distanceKm);
    dto.pickup_address = offer.pickupAddress
      ? AddressSummaryDto.fromDomain(offer.pickupAddress)
      : null;
    dto.trip_distance_km =
      offer.tripDistanceKm === null ? null : roundKm(offer.tripDistanceKm);
    return dto;
  }
}
