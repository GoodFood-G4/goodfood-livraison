import { GeoPoint } from './geo-point';
import { haversineDistanceKm } from './haversine';

describe('haversineDistanceKm', () => {
  it('retourne 0 pour deux points identiques', () => {
    const point = GeoPoint.create(49.4938, 0.1077);
    expect(haversineDistanceKm(point, point)).toBeCloseTo(0, 5);
  });

  it('calcule la distance approximative Le Havre -> Paris (~170km)', () => {
    const leHavre = GeoPoint.create(49.4938, 0.1077);
    const paris = GeoPoint.create(48.8566, 2.3522);
    const distance = haversineDistanceKm(leHavre, paris);
    expect(distance).toBeGreaterThan(160);
    expect(distance).toBeLessThan(180);
  });

  it('est symétrique', () => {
    const a = GeoPoint.create(49.4938, 0.1077);
    const b = GeoPoint.create(48.8566, 2.3522);
    expect(haversineDistanceKm(a, b)).toBeCloseTo(
      haversineDistanceKm(b, a),
      10,
    );
  });
});
