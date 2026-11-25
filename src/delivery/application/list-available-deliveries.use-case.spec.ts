import { GeoPoint } from '../../shared/domain/geo-point';
import { ListAvailableDeliveriesUseCase } from './list-available-deliveries.use-case';
import {
  buildAddress,
  buildPendingDelivery,
  InMemoryAddressRepository,
  InMemoryDeliveryRepository,
} from './test-doubles';

describe('ListAvailableDeliveriesUseCase', () => {
  let repository: InMemoryDeliveryRepository;
  let addresses: InMemoryAddressRepository;
  let useCase: ListAvailableDeliveriesUseCase;

  beforeEach(() => {
    repository = new InMemoryDeliveryRepository();
    addresses = new InMemoryAddressRepository();
    useCase = new ListAvailableDeliveriesUseCase(repository, addresses, 5, 50);
  });

  it("applique le rayon par défaut quand aucun rayon n'est fourni", async () => {
    const spy = jest.spyOn(repository, 'findAvailableWithinRadius');

    await useCase.execute({ latitude: 49.4938, longitude: 0.1077 });

    expect(spy).toHaveBeenCalledWith(expect.anything(), 5);
  });

  it("utilise le rayon demandé s'il est sous le maximum", async () => {
    const spy = jest.spyOn(repository, 'findAvailableWithinRadius');

    await useCase.execute({
      latitude: 49.4938,
      longitude: 0.1077,
      radiusKm: 20,
    });

    expect(spy).toHaveBeenCalledWith(expect.anything(), 20);
  });

  it('plafonne le rayon demandé au maximum configuré', async () => {
    const spy = jest.spyOn(repository, 'findAvailableWithinRadius');

    await useCase.execute({
      latitude: 49.4938,
      longitude: 0.1077,
      radiusKm: 1000,
    });

    expect(spy).toHaveBeenCalledWith(expect.anything(), 50);
  });

  it("joint l'adresse de retrait et la longueur de la course, sans l'adresse du client", async () => {
    const pickup = buildAddress({ id: 'address-pickup' });
    // ~1,11 km au nord du point de retrait
    const destination = buildAddress({
      id: 'address-destination',
      location: GeoPoint.create(49.5038, 0.1077),
    });
    await addresses.save(pickup);
    await addresses.save(destination);
    const delivery = buildPendingDelivery();
    repository.availableResults = [{ delivery, distanceKm: 0.4 }];

    const [offer] = await useCase.execute({
      latitude: 49.4938,
      longitude: 0.1077,
    });

    expect(offer.delivery).toBe(delivery);
    expect(offer.distanceKm).toBe(0.4);
    expect(offer.pickupAddress).toBe(pickup);
    expect(offer.tripDistanceKm).toBeCloseTo(1.11, 2);
    expect(offer).not.toHaveProperty('destinationAddress');
  });

  it('sans adresse de retrait : pas de longueur de course', async () => {
    await addresses.save(buildAddress({ id: 'address-destination' }));
    repository.availableResults = [
      {
        delivery: buildPendingDelivery({ pickupAddressId: null }),
        distanceKm: 1,
      },
    ];

    const [offer] = await useCase.execute({
      latitude: 49.4938,
      longitude: 0.1077,
    });

    expect(offer.pickupAddress).toBeNull();
    expect(offer.tripDistanceKm).toBeNull();
  });
});
