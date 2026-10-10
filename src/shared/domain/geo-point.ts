export class InvalidGeoPointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidGeoPointError';
  }
}

/**
 * Value object immuable : un GeoPoint invalide ne peut pas exister, la validation
 * se fait entièrement à la construction.
 */
export class GeoPoint {
  private constructor(
    public readonly latitude: number,
    public readonly longitude: number,
  ) {}

  static create(latitude: number, longitude: number): GeoPoint {
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw new InvalidGeoPointError(
        `Latitude invalide : ${latitude} (doit être comprise entre -90 et 90)`,
      );
    }
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw new InvalidGeoPointError(
        `Longitude invalide : ${longitude} (doit être comprise entre -180 et 180)`,
      );
    }
    return new GeoPoint(latitude, longitude);
  }

  equals(other: GeoPoint): boolean {
    return (
      this.latitude === other.latitude && this.longitude === other.longitude
    );
  }
}
