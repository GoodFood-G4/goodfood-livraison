import { GeoPoint } from '../../shared/domain/geo-point';
import { Paginated } from '../../shared/application/paginated';
import { Clock } from '../../shared/application/ports/clock.port';
import { IdGenerator } from '../../shared/application/ports/id-generator.port';
import { Address } from '../../address/domain/address';
import { AddressRepository } from '../../address/domain/address-repository.port';
import { Geocoder, GeocodeQuery } from '../../address/domain/geocoder.port';
import { Delivery } from '../domain/delivery';
import {
  AvailableDeliveryResult,
  DeliveryRepository,
} from '../domain/delivery-repository.port';
import {
  DeliveryEventPayload,
  DeliveryEventPublisher,
} from '../domain/delivery-event-publisher.port';
import { TransactionalRepositories, UnitOfWork } from './unit-of-work.port';

/**
 * Doublures en mémoire pour les tests de use cases : jamais de vraie base,
 * de vrai réseau ou de vrai RabbitMQ dans ces tests.
 */
export class InMemoryDeliveryRepository implements DeliveryRepository {
  readonly deliveries = new Map<string, Delivery>();
  activeCountByCourier = new Map<string, number>();

  async save(delivery: Delivery): Promise<void> {
    this.deliveries.set(delivery.id, delivery);
  }

  async findById(id: string): Promise<Delivery | null> {
    return this.deliveries.get(id) ?? null;
  }

  async findByOrderId(orderId: string): Promise<Delivery | null> {
    for (const delivery of this.deliveries.values()) {
      if (delivery.orderId === orderId) {
        return delivery;
      }
    }
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

  async findHistoryForCourier(
    courierId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<Delivery>> {
    const all = [...this.deliveries.values()]
      .filter((delivery) => delivery.courierId === courierId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * limit;
    return {
      data: all.slice(start, start + limit),
      meta: { page, limit, total: all.length },
    };
  }
}

export class FakeDeliveryEventPublisher implements DeliveryEventPublisher {
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

export class InMemoryAddressRepository implements AddressRepository {
  readonly addresses = new Map<string, Address>();

  async save(address: Address): Promise<void> {
    this.addresses.set(address.id, address);
  }

  async findById(id: string): Promise<Address | null> {
    return this.addresses.get(id) ?? null;
  }
}

/**
 * Simule une transaction : les écritures vont dans des copies des
 * repositories, recopiées dans les originaux seulement si `work` réussit.
 * `failOn` permet de faire échouer une écriture en cours de transaction.
 */
export class InMemoryUnitOfWork implements UnitOfWork {
  runCount = 0;
  failOn: 'address' | 'delivery' | null = null;

  constructor(
    private readonly addressRepository: InMemoryAddressRepository,
    private readonly deliveryRepository: InMemoryDeliveryRepository,
  ) {}

  async run<T>(
    work: (repositories: TransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    this.runCount += 1;
    const addresses = new InMemoryAddressRepository();
    const deliveries = new InMemoryDeliveryRepository();
    this.addressRepository.addresses.forEach((a, id) =>
      addresses.addresses.set(id, a),
    );
    this.deliveryRepository.deliveries.forEach((d, id) =>
      deliveries.deliveries.set(id, d),
    );

    const failOn = this.failOn;
    const transactional: TransactionalRepositories = {
      addresses: {
        save: async (address) => {
          if (failOn === 'address') throw new Error('échec écriture adresse');
          await addresses.save(address);
        },
        findById: (id) => addresses.findById(id),
      },
      deliveries: Object.assign(Object.create(deliveries), {
        save: async (delivery: Delivery) => {
          if (failOn === 'delivery')
            throw new Error('échec écriture livraison');
          await deliveries.save(delivery);
        },
      }) as InMemoryDeliveryRepository,
    };

    const result = await work(transactional);

    addresses.addresses.forEach((a, id) =>
      this.addressRepository.addresses.set(id, a),
    );
    deliveries.deliveries.forEach((d, id) =>
      this.deliveryRepository.deliveries.set(id, d),
    );
    return result;
  }
}

/** Retourne les réponses programmées dans l'ordre, puis un point par défaut. */
export class ScriptedGeocoder implements Geocoder {
  readonly queries: GeocodeQuery[] = [];

  constructor(private readonly responses: Array<GeoPoint | null> = []) {}

  async geocode(query: GeocodeQuery): Promise<GeoPoint | null> {
    this.queries.push(query);
    return this.responses.length > 0
      ? (this.responses.shift() as GeoPoint | null)
      : GeoPoint.create(49.4938, 0.1077);
  }
}

export class FixedClock implements Clock {
  constructor(private readonly date: Date) {}
  now(): Date {
    return this.date;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export function buildAddress(
  overrides: Partial<Parameters<typeof Address.create>[0]> = {},
): Address {
  return Address.create({
    id: 'address-1',
    country: 'France',
    street: '2 Rue de Paris',
    postalCode: '76600',
    city: 'Le Havre',
    location: GeoPoint.create(49.4938, 0.1077),
    createdBy: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

export function buildPendingDelivery(
  overrides: Record<string, unknown> = {},
): Delivery {
  return Delivery.create({
    id: 'delivery-1',
    orderId: 'order-1',
    customerId: 'customer-1',
    franchiseId: 'franchise-1',
    destinationAddressId: 'address-destination',
    pickupAddressId: 'address-pickup',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}
