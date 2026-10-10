import { DeliveryStatus } from '../domain/delivery-status';
import {
  DeliveryNotFoundError,
  InvalidStatusTransitionError,
  NotAssignedCourierError,
} from '../domain/errors';
import { UpdateDeliveryStatusUseCase } from './update-delivery-status.use-case';
import {
  FakeDeliveryEventPublisher,
  FixedClock,
  InMemoryDeliveryRepository,
  buildPendingDelivery,
} from './test-doubles';

describe('UpdateDeliveryStatusUseCase', () => {
  let repository: InMemoryDeliveryRepository;
  let publisher: FakeDeliveryEventPublisher;
  let useCase: UpdateDeliveryStatusUseCase;

  beforeEach(() => {
    repository = new InMemoryDeliveryRepository();
    publisher = new FakeDeliveryEventPublisher();
    useCase = new UpdateDeliveryStatusUseCase(
      repository,
      publisher,
      new FixedClock(new Date('2026-01-01T02:00:00.000Z')),
    );
  });

  it('fait avancer assigned -> picked_up et publie delivery.picked_up', async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    repository.deliveries.set(delivery.id, delivery);

    const result = await useCase.execute({
      deliveryId: delivery.id,
      courierId: 'courier-1',
      status: DeliveryStatus.PICKED_UP,
    });

    expect(result.status).toBe(DeliveryStatus.PICKED_UP);
    expect(publisher.published[0].event).toBe('picked_up');
  });

  it('publie delivery.started pour in_transit et delivery.completed pour delivered', async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    delivery.advanceTo(DeliveryStatus.PICKED_UP, 'courier-1', new Date());
    repository.deliveries.set(delivery.id, delivery);

    await useCase.execute({
      deliveryId: delivery.id,
      courierId: 'courier-1',
      status: DeliveryStatus.IN_TRANSIT,
    });
    await useCase.execute({
      deliveryId: delivery.id,
      courierId: 'courier-1',
      status: DeliveryStatus.DELIVERED,
    });

    expect(publisher.published.map((p) => p.event)).toEqual([
      'started',
      'completed',
    ]);
  });

  it('lève DeliveryNotFoundError si absente', async () => {
    await expect(
      useCase.execute({
        deliveryId: 'inconnue',
        courierId: 'courier-1',
        status: DeliveryStatus.PICKED_UP,
      }),
    ).rejects.toThrow(DeliveryNotFoundError);
  });

  it("lève InvalidStatusTransitionError pour un saut d'étape", async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    repository.deliveries.set(delivery.id, delivery);

    await expect(
      useCase.execute({
        deliveryId: delivery.id,
        courierId: 'courier-1',
        status: DeliveryStatus.IN_TRANSIT,
      }),
    ).rejects.toThrow(InvalidStatusTransitionError);
  });

  it('lève NotAssignedCourierError pour un livreur non assigné', async () => {
    const delivery = buildPendingDelivery();
    delivery.accept('courier-1', new Date());
    repository.deliveries.set(delivery.id, delivery);

    await expect(
      useCase.execute({
        deliveryId: delivery.id,
        courierId: 'courier-2',
        status: DeliveryStatus.PICKED_UP,
      }),
    ).rejects.toThrow(NotAssignedCourierError);
  });
});
