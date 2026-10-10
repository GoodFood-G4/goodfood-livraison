import { GeoPoint } from '../../shared/domain/geo-point';
import { Paginated } from '../../shared/application/paginated';
import { Clock } from '../../shared/application/ports/clock.port';
import { Delivery } from '../domain/delivery';
import {
  AvailableDeliveryResult,
  DeliveryRepository,
} from '../domain/delivery-repository.port';
import {
  DeliveryEventPayload,
  DeliveryEventPublisher,
} from '../domain/delivery-event-publisher.port';
import {
  CourierBusyError,
  DeliveryAlreadyAssignedError,
  DeliveryNotFoundError,
} from '../domain/errors';
import { AcceptDeliveryUseCase } from './accept-delivery.use-case';

class InMemoryDeliveryRepository implements DeliveryRepository {
  readonly deliveries = new Map<string, Delivery>();
  activeCountByCourier = new Map<string, number>();
  simulateVersionConflictFor: string | null = null;

  async save(delivery: Delivery): Promise<void> {
    if (this.simulateVersionConflictFor === delivery.id) {
      throw new DeliveryAlreadyAssignedError(delivery.id);
    }
    this.deliveries.set(delivery.id, delivery);
  }

  async findById(id: string): Promise<Delivery | null> {
    return this.deliveries.get(id) ?? null;
  }

  async findByOrderId(): Promise<Delivery | null> {
    return null;
  }

  async countActiveForCourier(courierId: string): Promise<number> {
    return this.activeCountByCourier.get(courierId) ?? 0;
  }

  async findAvailableWithinRadius(
    _center: GeoPoint,
    _radiusKm: number,
  ): Promise<AvailableDeliveryResult[]> {
    return [];
  }

  async findHistoryForCourier(): Promise<Paginated<Delivery>> {
    return { data: [], meta: { page: 1, limit: 20, total: 0 } };
  }
}

class FakeDeliveryEventPublisher implements DeliveryEventPublisher {
  readonly published: Array<{ event: string; payload: DeliveryEventPayload }> =
    [];

  async publishAssigned(payload: DeliveryEventPayload): Promise<void> {
    this.published.push({ event: 'assigned', payload });
  }
  async publishPickedUp(payload: DeliveryEventPayload): Promise<void> {
    this.published.push({ event: 'picked_up', payload });
  }
  async publishStarted(payload: DeliveryEventPayload): Promise<void> {
    this.published.push({ event: 'started', payload });
  }
  async publishCompleted(payload: DeliveryEventPayload): Promise<void> {
    this.published.push({ event: 'completed', payload });
  }
}

class FixedClock implements Clock {
  constructor(private readonly date: Date) {}
  now(): Date {
    return this.date;
  }
}

function buildPendingDelivery(id: string): Delivery {
  return Delivery.create({
    id,
    orderId: `order-${id}`,
    customerId: 'customer-1',
    franchiseId: 'franchise-1',
    destinationAddressId: 'address-destination',
    pickupAddressId: 'address-pickup',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('AcceptDeliveryUseCase', () => {
  const MAX_ACTIVE = 3;
  let repository: InMemoryDeliveryRepository;
  let publisher: FakeDeliveryEventPublisher;
  let useCase: AcceptDeliveryUseCase;

  beforeEach(() => {
    repository = new InMemoryDeliveryRepository();
    publisher = new FakeDeliveryEventPublisher();
    useCase = new AcceptDeliveryUseCase(
      repository,
      publisher,
      new FixedClock(new Date('2026-01-01T01:00:00.000Z')),
      MAX_ACTIVE,
    );
  });

  it('accepte une livraison pending et publie delivery.assigned', async () => {
    const delivery = buildPendingDelivery('delivery-1');
    repository.deliveries.set(delivery.id, delivery);

    const result = await useCase.execute({
      deliveryId: 'delivery-1',
      courierId: 'courier-1',
    });

    expect(result.status).toBe('assigned');
    expect(result.courierId).toBe('courier-1');
    expect(publisher.published).toHaveLength(1);
    expect(publisher.published[0].event).toBe('assigned');
  });

  it("lève DeliveryNotFoundError si la livraison n'existe pas", async () => {
    await expect(
      useCase.execute({ deliveryId: 'inconnue', courierId: 'courier-1' }),
    ).rejects.toThrow(DeliveryNotFoundError);
  });

  it('lève DeliveryAlreadyAssignedError si déjà assignée', async () => {
    const delivery = buildPendingDelivery('delivery-1');
    delivery.accept('autre-courier', new Date());
    repository.deliveries.set(delivery.id, delivery);

    await expect(
      useCase.execute({ deliveryId: 'delivery-1', courierId: 'courier-1' }),
    ).rejects.toThrow(DeliveryAlreadyAssignedError);
  });

  it('lève CourierBusyError si le livreur a atteint sa limite', async () => {
    const delivery = buildPendingDelivery('delivery-1');
    repository.deliveries.set(delivery.id, delivery);
    repository.activeCountByCourier.set('courier-1', MAX_ACTIVE);

    await expect(
      useCase.execute({ deliveryId: 'delivery-1', courierId: 'courier-1' }),
    ).rejects.toThrow(CourierBusyError);
  });

  it('convertit un conflit de verrou optimiste en DeliveryAlreadyAssignedError (course simultanée)', async () => {
    const delivery = buildPendingDelivery('delivery-1');
    repository.deliveries.set(delivery.id, delivery);
    repository.simulateVersionConflictFor = 'delivery-1';

    await expect(
      useCase.execute({ deliveryId: 'delivery-1', courierId: 'courier-1' }),
    ).rejects.toThrow(DeliveryAlreadyAssignedError);
  });
});
