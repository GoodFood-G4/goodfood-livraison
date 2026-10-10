import { GeoPoint } from '../../shared/domain/geo-point';
import { haversineDistanceKm } from '../../shared/domain/haversine';
import { DeliveryStatus } from './delivery-status';

export interface EtaCalculationInput {
  readonly status: DeliveryStatus;
  readonly courierLocation: GeoPoint | null;
  readonly pickupLocation: GeoPoint | null;
  readonly destinationLocation: GeoPoint;
  readonly averageSpeedKmh: number;
}

/**
 * Service de domaine pur (fonction de Haversine / vitesse moyenne) : aucune
 * dépendance à une horloge ou à l'infrastructure, entièrement déterministe.
 */
export class EtaCalculator {
  calculate(input: EtaCalculationInput): number | null {
    if (!input.courierLocation) {
      return null;
    }
    if (
      input.status === DeliveryStatus.DELIVERED ||
      input.status === DeliveryStatus.PENDING
    ) {
      return null;
    }

    const target = this.resolveTarget(input);
    const distanceKm = haversineDistanceKm(input.courierLocation, target);
    const hours = distanceKm / input.averageSpeedKmh;

    return Math.round(hours * 60);
  }

  private resolveTarget(input: EtaCalculationInput): GeoPoint {
    if (input.status === DeliveryStatus.ASSIGNED) {
      return input.pickupLocation ?? input.destinationLocation;
    }
    return input.destinationLocation;
  }
}
