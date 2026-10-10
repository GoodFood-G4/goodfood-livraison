import { GeoPoint } from '../../shared/domain/geo-point';
import { DeliveryStatus } from './delivery-status';
import { EtaCalculator } from './eta-calculator';

describe('EtaCalculator', () => {
  const calculator = new EtaCalculator();
  const courierLocation = GeoPoint.create(49.4938, 0.1077);
  const pickupLocation = GeoPoint.create(49.5, 0.12);
  const destinationLocation = GeoPoint.create(49.51, 0.13);

  it('retourne null sans position du livreur', () => {
    const eta = calculator.calculate({
      status: DeliveryStatus.ASSIGNED,
      courierLocation: null,
      pickupLocation,
      destinationLocation,
      averageSpeedKmh: 20,
    });
    expect(eta).toBeNull();
  });

  it('retourne null si la livraison est livrée', () => {
    const eta = calculator.calculate({
      status: DeliveryStatus.DELIVERED,
      courierLocation,
      pickupLocation,
      destinationLocation,
      averageSpeedKmh: 20,
    });
    expect(eta).toBeNull();
  });

  it('retourne null si pending', () => {
    const eta = calculator.calculate({
      status: DeliveryStatus.PENDING,
      courierLocation,
      pickupLocation,
      destinationLocation,
      averageSpeedKmh: 20,
    });
    expect(eta).toBeNull();
  });

  it('cible le point de retrait quand assigned', () => {
    const eta = calculator.calculate({
      status: DeliveryStatus.ASSIGNED,
      courierLocation,
      pickupLocation,
      destinationLocation,
      averageSpeedKmh: 20,
    });
    expect(eta).not.toBeNull();
    expect(eta).toBeGreaterThan(0);
  });

  it("cible l'adresse de livraison quand assigned sans adresse de retrait", () => {
    const eta = calculator.calculate({
      status: DeliveryStatus.ASSIGNED,
      courierLocation,
      pickupLocation: null,
      destinationLocation,
      averageSpeedKmh: 20,
    });
    expect(eta).not.toBeNull();
  });

  it.each([DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT])(
    "cible l'adresse de livraison pour %s",
    (status) => {
      const eta = calculator.calculate({
        status,
        courierLocation,
        pickupLocation,
        destinationLocation,
        averageSpeedKmh: 20,
      });
      expect(eta).not.toBeNull();
    },
  );

  it('une vitesse plus élevée réduit le temps estimé', () => {
    const slow = calculator.calculate({
      status: DeliveryStatus.IN_TRANSIT,
      courierLocation,
      pickupLocation,
      destinationLocation,
      averageSpeedKmh: 10,
    });
    const fast = calculator.calculate({
      status: DeliveryStatus.IN_TRANSIT,
      courierLocation,
      pickupLocation,
      destinationLocation,
      averageSpeedKmh: 40,
    });
    expect(fast as number).toBeLessThan(slow as number);
  });
});
