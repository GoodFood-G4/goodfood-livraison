import { DeliveryStatus } from '../domain/delivery-status';
import {
  DeliveryNotFoundError,
  InvalidStatusTransitionError,
  NotAssignedCourierError,
} from '../domain/errors';
import { UpdateCourierLocationUseCase } from './update-courier-location.use-case';
import {
  FixedClock,
  InMemoryDeliveryRepository,
  buildPendingDelivery,
} from './test-doubles';

describe('UpdateCourierLocationUseCase', () => {
  let repository: InMemoryDeliveryRepository;
  let useCase: UpdateCourierLocationUseCase;

  beforeEach(() => {
    repository = new InMemoryDeliveryRepository();
    useCase = new UpdateCourierLocationUseCase(
      repository,
      new FixedClock(new Date('2026-01-01T03:00:00.000Z')),
    );
  });

  it('met à jour la position du livreur assigné', async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    repository.deliveries.set(delivery.id, delivery);

    await useCase.execute({
      deliveryId: delivery.id,
      courierId: 'courier-1',
      latitude: 49.4938,
      longitude: 0.1077,
    });

    const updated = await repository.findById(delivery.id);
    expect(updated?.courierLocation?.latitude).toBe(49.4938);
  });

  it('lève DeliveryNotFoundError si absente', async () => {
    await expect(
      useCase.execute({
        deliveryId: 'inconnue',
        courierId: 'courier-1',
        latitude: 0,
        longitude: 0,
      }),
    ).rejects.toThrow(DeliveryNotFoundError);
  });

  it('lève NotAssignedCourierError pour un livreur non assigné', async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    repository.deliveries.set(delivery.id, delivery);

    await expect(
      useCase.execute({
        deliveryId: delivery.id,
        courierId: 'courier-2',
        latitude: 0,
        longitude: 0,
      }),
    ).rejects.toThrow(NotAssignedCourierError);
  });

  it('refuse une position avant acceptation (pending, aucun livreur assigné)', async () => {
    const delivery = buildPendingDelivery();
    repository.deliveries.set(delivery.id, delivery);

    await expect(
      useCase.execute({
        deliveryId: delivery.id,
        courierId: 'courier-1',
        latitude: 0,
        longitude: 0,
      }),
    ).rejects.toThrow(NotAssignedCourierError);
  });

  it('refuse une position après livraison (delivered)', async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    delivery.advanceTo(DeliveryStatus.PICKED_UP, 'courier-1', new Date());
    delivery.advanceTo(DeliveryStatus.IN_TRANSIT, 'courier-1', new Date());
    delivery.advanceTo(DeliveryStatus.DELIVERED, 'courier-1', new Date());
    repository.deliveries.set(delivery.id, delivery);

    await expect(
      useCase.execute({
        deliveryId: delivery.id,
        courierId: 'courier-1',
        latitude: 0,
        longitude: 0,
      }),
    ).rejects.toThrow(InvalidStatusTransitionError);
  });
});
