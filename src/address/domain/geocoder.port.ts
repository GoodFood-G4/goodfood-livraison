import { GeoPoint } from '../../shared/domain/geo-point';

export const GEOCODER = Symbol('GEOCODER');

export interface GeocodeQuery {
  readonly country: string;
  readonly street: string;
  readonly postalCode: string;
  readonly city: string;
}

/**
 * Retourne `null` quand le géocodage échoue ou ne trouve aucun résultat ;
 * c'est au use case de transformer cette absence en AddressNotGeocodableError.
 */
export interface Geocoder {
  geocode(query: GeocodeQuery): Promise<GeoPoint | null>;
}
