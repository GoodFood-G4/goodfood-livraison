import { AddressNotGeocodableError } from '../../address/domain/errors';
import { GeoPoint } from '../../shared/domain/geo-point';
import { DuplicateOrderError } from '../domain/errors';
import { HandleOrderReadyUseCase } from './handle-order-ready.use-case';
import {
  FixedClock,
  InMemoryAddressRepository,
  InMemoryDeliveryRepository,
  InMemoryUnitOfWork,
  ScriptedGeocoder,
  SequentialIdGenerator,
  buildPendingDelivery,
} from './test-doubles';

describe('HandleOrderReadyUseCase', () => {
  let deliveryRepository: InMemoryDeliveryRepository;
  let addressRepository: InMemoryAddressRepository;
  let unitOfWork: InMemoryUnitOfWork;
  let geocoder: ScriptedGeocoder;

  function buildUseCase(): HandleOrderReadyUseCase {
    return new HandleOrderReadyUseCase(
      deliveryRepository,
      geocoder,
      unitOfWork,
      new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
      new SequentialIdGenerator(),
    );
  }

  beforeEach(() => {
    deliveryRepository = new InMemoryDeliveryRepository();
    addressRepository = new InMemoryAddressRepository();
    unitOfWork = new InMemoryUnitOfWork(addressRepository, deliveryRepository);
    geocoder = new ScriptedGeocoder();
  });

  const deliveryAddress = {
    country: 'France',
    street: '2 Rue de Paris',
    postalCode: '76600',
    city: 'Le Havre',
  };
  const pickupAddress = {
    country: 'France',
    street: '10 Rue du Restaurant',
    postalCode: '76600',
    city: 'Le Havre',
  };
  const basePayload = {
    orderId: 'order-1',
    userId: 'customer-1',
    franchiseId: 'franchise-1',
    deliveryAddress: {
      ...deliveryAddress,
      latitude: 49.4938,
      longitude: 0.1077,
    },
    pickupAddress,
  };

  it('crée les deux adresses et la livraison dans une seule transaction', async () => {
    const result = await buildUseCase().execute(basePayload);

    expect(result.created).toBe(true);
    expect(result.delivery?.orderId).toBe('order-1');
    expect(unitOfWork.runCount).toBe(1);
    expect(addressRepository.addresses.size).toBe(2);
    expect(deliveryRepository.deliveries.size).toBe(1);
    const destination = addressRepository.addresses.get(
      result.delivery!.destinationAddressId,
    );
    expect(destination?.createdBy).toBe('customer-1');
    // Seule l'adresse sans coordonnées est géocodée.
    expect(geocoder.queries).toEqual([pickupAddress]);
  });

  it('est idempotent : ne géocode ni ne crée rien si la livraison existe déjà', async () => {
    const existing = buildPendingDelivery({ orderId: 'order-1' });
    deliveryRepository.deliveries.set(existing.id, existing);

    const result = await buildUseCase().execute(basePayload);

    expect(result).toEqual({ created: false, delivery: null });
    expect(geocoder.queries).toHaveLength(0);
    expect(unitOfWork.runCount).toBe(0);
    expect(addressRepository.addresses.size).toBe(0);
  });

  it("n'écrit aucune ligne si le géocodage de la deuxième adresse échoue", async () => {
    geocoder = new ScriptedGeocoder([GeoPoint.create(49.49, 0.1), null]);

    await expect(
      buildUseCase().execute({ ...basePayload, deliveryAddress }),
    ).rejects.toBeInstanceOf(AddressNotGeocodableError);

    expect(geocoder.queries).toHaveLength(2);
    expect(unitOfWork.runCount).toBe(0);
    expect(addressRepository.addresses.size).toBe(0);
    expect(deliveryRepository.deliveries.size).toBe(0);
  });

  it('annule les adresses si la création de la livraison échoue en cours de transaction', async () => {
    unitOfWork.failOn = 'delivery';

    await expect(buildUseCase().execute(basePayload)).rejects.toThrow(
      'échec écriture livraison',
    );

    expect(unitOfWork.runCount).toBe(1);
    expect(addressRepository.addresses.size).toBe(0);
    expect(deliveryRepository.deliveries.size).toBe(0);
  });

  it('lève DuplicateOrderError si la livraison apparaît pendant le géocodage', async () => {
    const useCase = buildUseCase();
    const original = geocoder.geocode.bind(geocoder);
    geocoder.geocode = async (query) => {
      const existing = buildPendingDelivery({ orderId: 'order-1' });
      deliveryRepository.deliveries.set(existing.id, existing);
      return original(query);
    };

    await expect(useCase.execute(basePayload)).rejects.toBeInstanceOf(
      DuplicateOrderError,
    );
    expect(addressRepository.addresses.size).toBe(0);
  });
});
