import { GeoPoint } from '../../shared/domain/geo-point';
import { Paginated } from '../../shared/application/paginated';
import { Clock } from '../../shared/application/ports/clock.port';
import { IdGenerator } from '../../shared/application/ports/id-generator.port';
import { Address } from '../../address/domain/address';
import { AddressRepository } from '../../address/domain/address-repository.port';
import { Delivery } from '../domain/delivery';
import {
  AvailableDeliveryResult,
  DeliveryRepository,
} from '../domain/delivery-repository.port';
import {
  DeliveryEventPayload,
  DeliveryEventPublisher,
} from '../domain/delivery-event-publisher.port';

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
