import { GeoPoint } from '../../shared/domain/geo-point';
import { Delivery } from './delivery';
import { DeliveryStatus } from './delivery-status';
import {
  DeliveryAlreadyAssignedError,
  InvalidStatusTransitionError,
  NotAssignedCourierError,
} from './errors';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const LATER = new Date('2026-01-01T00:10:00.000Z');

function buildPendingDelivery(): Delivery {
  return Delivery.create({
    id: 'delivery-1',
    orderId: 'order-1',
    customerId: 'customer-1',
    franchiseId: 'franchise-1',
    destinationAddressId: 'address-destination',
    pickupAddressId: 'address-pickup',
    createdAt: NOW,
  });
}

describe('Delivery', () => {
  describe('accept', () => {
    it('passe de pending à assigned', () => {
      const delivery = buildPendingDelivery();

      delivery.accept('courier-1', LATER);

      expect(delivery.status).toBe(DeliveryStatus.ASSIGNED);
      expect(delivery.courierId).toBe('courier-1');
      expect(delivery.acceptedAt).toEqual(LATER);
    });

    it('refuse une seconde acceptation', () => {
      const delivery = buildPendingDelivery();
      delivery.accept('courier-1', LATER);

      expect(() => delivery.accept('courier-2', LATER)).toThrow(
        DeliveryAlreadyAssignedError,
      );
    });
  });

  describe('advanceTo', () => {
    it('suit la chaîne assigned -> picked_up -> in_transit -> delivered', () => {
      const delivery = buildPendingDelivery();
      delivery.accept('courier-1', NOW);

      delivery.advanceTo(DeliveryStatus.PICKED_UP, 'courier-1', LATER);
      expect(delivery.status).toBe(DeliveryStatus.PICKED_UP);
      expect(delivery.pickedUpAt).toEqual(LATER);

      delivery.advanceTo(DeliveryStatus.IN_TRANSIT, 'courier-1', LATER);
      expect(delivery.status).toBe(DeliveryStatus.IN_TRANSIT);

      delivery.advanceTo(DeliveryStatus.DELIVERED, 'courier-1', LATER);
      expect(delivery.status).toBe(DeliveryStatus.DELIVERED);
      expect(delivery.deliveredAt).toEqual(LATER);
    });

    it('refuse de sauter une étape', () => {
      const delivery = buildPendingDelivery();
      delivery.accept('courier-1', NOW);

      expect(() =>
        delivery.advanceTo(DeliveryStatus.IN_TRANSIT, 'courier-1', LATER),
      ).toThrow(InvalidStatusTransitionError);
    });

    it('refuse de repasser à assigned ou pending via advanceTo', () => {
      const delivery = buildPendingDelivery();
      delivery.accept('courier-1', NOW);
      delivery.advanceTo(DeliveryStatus.PICKED_UP, 'courier-1', NOW);

      expect(() =>
        delivery.advanceTo(DeliveryStatus.ASSIGNED, 'courier-1', LATER),
      ).toThrow(InvalidStatusTransitionError);
    });

    it("refuse l'action d'un livreur non assigné", () => {
      const delivery = buildPendingDelivery();
      delivery.accept('courier-1', NOW);

      expect(() =>
        delivery.advanceTo(DeliveryStatus.PICKED_UP, 'courier-2', LATER),
      ).toThrow(NotAssignedCourierError);
    });

    it('refuse de faire avancer une livraison déjà livrée', () => {
      const delivery = buildPendingDelivery();
      delivery.accept('courier-1', NOW);
      delivery.advanceTo(DeliveryStatus.PICKED_UP, 'courier-1', NOW);
      delivery.advanceTo(DeliveryStatus.IN_TRANSIT, 'courier-1', NOW);
      delivery.advanceTo(DeliveryStatus.DELIVERED, 'courier-1', NOW);

      expect(() =>
        delivery.advanceTo(DeliveryStatus.DELIVERED, 'courier-1', LATER),
      ).toThrow(InvalidStatusTransitionError);
    });
  });

  describe('updateLocation', () => {
    const location = GeoPoint.create(49.4938, 0.1077);

    it('accepte une position pour assigned, picked_up ou in_transit', () => {
      const delivery = buildPendingDelivery();
      delivery.accept('courier-1', NOW);

      delivery.updateLocation('courier-1', location, LATER);

      expect(delivery.courierLocation).toBe(location);
      expect(delivery.locationUpdatedAt).toEqual(LATER);
    });

    it('refuse une position avant acceptation (pending, aucun livreur assigné)', () => {
      const delivery = buildPendingDelivery();

      expect(() =>
        delivery.updateLocation('courier-1', location, LATER),
      ).toThrow(NotAssignedCourierError);
    });

    it('refuse une position après livraison (delivered)', () => {
      const delivery = buildPendingDelivery();
      delivery.accept('courier-1', NOW);
      delivery.advanceTo(DeliveryStatus.PICKED_UP, 'courier-1', NOW);
      delivery.advanceTo(DeliveryStatus.IN_TRANSIT, 'courier-1', NOW);
      delivery.advanceTo(DeliveryStatus.DELIVERED, 'courier-1', NOW);

      expect(() =>
        delivery.updateLocation('courier-1', location, LATER),
      ).toThrow(InvalidStatusTransitionError);
    });

    it("refuse la position d'un livreur non assigné", () => {
      const delivery = buildPendingDelivery();
      delivery.accept('courier-1', NOW);

      expect(() =>
        delivery.updateLocation('courier-2', location, LATER),
      ).toThrow(NotAssignedCourierError);
    });
  });

  describe('isActive / isTerminated', () => {
    it('est actif uniquement entre assigned et in_transit', () => {
      const delivery = buildPendingDelivery();
      expect(delivery.isActive()).toBe(false);

      delivery.accept('courier-1', NOW);
      expect(delivery.isActive()).toBe(true);

      delivery.advanceTo(DeliveryStatus.PICKED_UP, 'courier-1', NOW);
      delivery.advanceTo(DeliveryStatus.IN_TRANSIT, 'courier-1', NOW);
      delivery.advanceTo(DeliveryStatus.DELIVERED, 'courier-1', NOW);

      expect(delivery.isActive()).toBe(false);
      expect(delivery.isTerminated()).toBe(true);
    });
  });
});
