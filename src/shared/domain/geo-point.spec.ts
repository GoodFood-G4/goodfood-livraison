import { GeoPoint, InvalidGeoPointError } from './geo-point';

describe('GeoPoint', () => {
  it('crée un point valide', () => {
    const point = GeoPoint.create(49.4938, 0.1077);
    expect(point.latitude).toBe(49.4938);
    expect(point.longitude).toBe(0.1077);
  });

  it.each([-91, 91, NaN])('rejette une latitude invalide (%p)', (latitude) => {
    expect(() => GeoPoint.create(latitude, 0)).toThrow(InvalidGeoPointError);
  });

  it.each([-181, 181, NaN])(
    'rejette une longitude invalide (%p)',
    (longitude) => {
      expect(() => GeoPoint.create(0, longitude)).toThrow(InvalidGeoPointError);
    },
  );

  it('accepte les bornes exactes', () => {
    expect(() => GeoPoint.create(90, 180)).not.toThrow();
    expect(() => GeoPoint.create(-90, -180)).not.toThrow();
  });

  it('compare deux points par valeur', () => {
    const a = GeoPoint.create(49.4938, 0.1077);
    const b = GeoPoint.create(49.4938, 0.1077);
    const c = GeoPoint.create(48.8566, 2.3522);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
