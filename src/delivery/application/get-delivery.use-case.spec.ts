import { Role } from '../../shared/application/actor';
import { GeoPoint } from '../../shared/domain/geo-point';
import { DeliveryStatus } from '../domain/delivery-status';
import {
  DeliveryNotFoundError,
  NotDeliveryViewerError,
} from '../domain/errors';
import { GetDeliveryUseCase } from './get-delivery.use-case';
import {
  InMemoryAddressRepository,
  InMemoryDeliveryRepository,
  buildAddress,
  buildPendingDelivery,
} from './test-doubles';

describe('GetDeliveryUseCase', () => {
  let deliveryRepository: InMemoryDeliveryRepository;
  let addressRepository: InMemoryAddressRepository;
  let useCase: GetDeliveryUseCase;

  beforeEach(() => {
    deliveryRepository = new InMemoryDeliveryRepository();
    addressRepository = new InMemoryAddressRepository();
    useCase = new GetDeliveryUseCase(deliveryRepository, addressRepository, 20);

    addressRepository.addresses.set(
      'address-destination',
      buildAddress({ id: 'address-destination' }),
    );
    addressRepository.addresses.set(
      'address-pickup',
      buildAddress({
        id: 'address-pickup',
        location: GeoPoint.create(49.5, 0.12),
      }),
    );
  });

  it('autorise le client propriétaire', async () => {
    const delivery = buildPendingDelivery({ customerId: 'customer-1' });
    deliveryRepository.deliveries.set(delivery.id, delivery);

    const result = await useCase.execute({
      deliveryId: delivery.id,
      actor: { userId: 'customer-1', role: Role.CUSTOMER },
    });

    expect(result.delivery.id).toBe(delivery.id);
    expect(result.destinationAddress.id).toBe('address-destination');
  });

  it('refuse un autre client', async () => {
    const delivery = buildPendingDelivery({ customerId: 'customer-1' });
    deliveryRepository.deliveries.set(delivery.id, delivery);

    await expect(
      useCase.execute({
        deliveryId: delivery.id,
        actor: { userId: 'customer-2', role: Role.CUSTOMER },
      }),
    ).rejects.toThrow(NotDeliveryViewerError);
  });

  it('autorise le livreur assigné', async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    deliveryRepository.deliveries.set(delivery.id, delivery);

    const result = await useCase.execute({
      deliveryId: delivery.id,
      actor: { userId: 'courier-1', role: Role.COURIER },
    });

    expect(result.delivery.courierId).toBe('courier-1');
  });

  it('refuse un autre livreur', async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    deliveryRepository.deliveries.set(delivery.id, delivery);

    await expect(
      useCase.execute({
        deliveryId: delivery.id,
        actor: { userId: 'courier-2', role: Role.COURIER },
      }),
    ).rejects.toThrow(NotDeliveryViewerError);
  });

  it('autorise un admin quel que soit le propriétaire', async () => {
    const delivery = buildPendingDelivery({ customerId: 'customer-1' });
    deliveryRepository.deliveries.set(delivery.id, delivery);

    const result = await useCase.execute({
      deliveryId: delivery.id,
      actor: { userId: 'admin-1', role: Role.ADMIN },
    });

    expect(result.delivery.id).toBe(delivery.id);
  });

  it('lève DeliveryNotFoundError si absente', async () => {
    await expect(
      useCase.execute({
        deliveryId: 'inconnue',
        actor: { userId: 'customer-1', role: Role.CUSTOMER },
      }),
    ).rejects.toThrow(DeliveryNotFoundError);
  });

  it('calcule une ETA une fois le livreur en position', async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    delivery.updateLocation(
      'courier-1',
      GeoPoint.create(49.49, 0.1),
      new Date(),
    );
    deliveryRepository.deliveries.set(delivery.id, delivery);

    const result = await useCase.execute({
      deliveryId: delivery.id,
      actor: { userId: 'courier-1', role: Role.COURIER },
    });

    expect(result.etaMinutes).not.toBeNull();
  });

  it('retourne une ETA nulle sans position du livreur', async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    deliveryRepository.deliveries.set(delivery.id, delivery);

    const result = await useCase.execute({
      deliveryId: delivery.id,
      actor: { userId: 'courier-1', role: Role.COURIER },
    });

    expect(result.etaMinutes).toBeNull();
    expect(result.delivery.status).toBe(DeliveryStatus.ASSIGNED);
  });

  it('fonctionne sans adresse de retrait (pickup_address_id absent)', async () => {
    const delivery = buildPendingDelivery({ pickupAddressId: null });
    delivery.accept('courier-1', new Date());
    deliveryRepository.deliveries.set(delivery.id, delivery);

    const result = await useCase.execute({
      deliveryId: delivery.id,
      actor: { userId: 'courier-1', role: Role.COURIER },
    });

    expect(result.pickupAddress).toBeNull();
  });

  it("lève DeliveryNotFoundError si l'adresse de livraison est introuvable (incohérence de données)", async () => {
    const delivery = buildPendingDelivery({
      destinationAddressId: 'address-inconnue',
    });
    deliveryRepository.deliveries.set(delivery.id, delivery);

    await expect(
      useCase.execute({
        deliveryId: delivery.id,
        actor: { userId: 'customer-1', role: Role.CUSTOMER },
      }),
    ).rejects.toThrow(DeliveryNotFoundError);
  });
});
