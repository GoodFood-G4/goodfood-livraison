import { GeoPoint } from '../../shared/domain/geo-point';
import { AddressNotGeocodableError } from '../domain/errors';
import { Geocoder, GeocodeQuery } from '../domain/geocoder.port';

export interface AddressLocationInput extends GeocodeQuery {
  readonly latitude?: number;
  readonly longitude?: number;
}

/**
 * Coordonnées fournies → utilisées telles quelles ; sinon géocodage.
 * Aucune écriture : peut être appelé avant d'ouvrir une transaction.
 */
export async function resolveAddressLocation(
  geocoder: Geocoder,
  input: AddressLocationInput,
): Promise<GeoPoint> {
  if (input.latitude !== undefined && input.longitude !== undefined) {
    return GeoPoint.create(input.latitude, input.longitude);
  }

  const geocoded = await geocoder.geocode({
    country: input.country,
    street: input.street,
    postalCode: input.postalCode,
    city: input.city,
  });

  if (!geocoded) {
    throw new AddressNotGeocodableError();
  }

  return geocoded;
}
