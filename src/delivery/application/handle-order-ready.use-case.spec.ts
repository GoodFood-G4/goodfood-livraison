import { CreateAddressUseCase } from '../../address/application/create-address.use-case';
import { GeoPoint } from '../../shared/domain/geo-point';
import { Geocoder, GeocodeQuery } from '../../address/domain/geocoder.port';
import { CreateDeliveryUseCase } from './create-delivery.use-case';
import { HandleOrderReadyUseCase } from './handle-order-ready.use-case';
import {
  FixedClock,
  InMemoryAddressRepository,
  InMemoryDeliveryRepository,
  SequentialIdGenerator,
  buildPendingDelivery,
} from './test-doubles';

class FakeGeocoder implements Geocoder {
  async geocode(_query: GeocodeQuery): Promise<GeoPoint | null> {
    return GeoPoint.create(49.4938, 0.1077);
  }
}

describe('HandleOrderReadyUseCase', () => {
  let deliveryRepository: InMemoryDeliveryRepository;
  let addressRepository: InMemoryAddressRepository;
  let useCase: HandleOrderReadyUseCase;

  beforeEach(() => {
    deliveryRepository = new InMemoryDeliveryRepository();
    addressRepository = new InMemoryAddressRepository();
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const idGenerator = new SequentialIdGenerator();

    const createAddressUseCase = new CreateAddressUseCase(
      addressRepository,
      new FakeGeocoder(),
      clock,
      idGenerator,
    );
    const createDeliveryUseCase = new CreateDeliveryUseCase(
      deliveryRepository,
      clock,
      idGenerator,
    );

    useCase = new HandleOrderReadyUseCase(
      deliveryRepository,
      createAddressUseCase,
      createDeliveryUseCase,
    );
  });

  const basePayload = {
    orderId: 'order-1',
    userId: 'customer-1',
    franchiseId: 'franchise-1',
    deliveryAddress: {
      country: 'France',
      street: '2 Rue de Paris',
      postalCode: '76600',
      city: 'Le Havre',
      latitude: 49.4938,
      longitude: 0.1077,
    },
    pickupAddress: {
      country: 'France',
      street: '10 Rue du Restaurant',
      postalCode: '76600',
      city: 'Le Havre',
    },
  };

  it('crée les deux adresses puis la livraison', async () => {
    const result = await useCase.execute(basePayload);

    expect(result.created).toBe(true);
    expect(result.delivery?.orderId).toBe('order-1');
    expect(addressRepository.addresses.size).toBe(2);
  });

  it('est idempotent : ne recrée rien si la livraison existe déjà', async () => {
    const existing = buildPendingDelivery({ orderId: 'order-1' });
    deliveryRepository.deliveries.set(existing.id, existing);

    const result = await useCase.execute(basePayload);

    expect(result.created).toBe(false);
    expect(result.delivery).toBeNull();
    expect(addressRepository.addresses.size).toBe(0);
  });
});
