import { DuplicateOrderError } from '../domain/errors';
import { CreateDeliveryUseCase } from './create-delivery.use-case';
import {
  FixedClock,
  InMemoryDeliveryRepository,
  SequentialIdGenerator,
  buildPendingDelivery,
} from './test-doubles';

describe('CreateDeliveryUseCase', () => {
  let repository: InMemoryDeliveryRepository;
  let useCase: CreateDeliveryUseCase;

  beforeEach(() => {
    repository = new InMemoryDeliveryRepository();
    useCase = new CreateDeliveryUseCase(
      repository,
      new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
      new SequentialIdGenerator(),
    );
  });

  it('crée une livraison pending', async () => {
    const delivery = await useCase.execute({
      orderId: 'order-1',
      customerId: 'customer-1',
      franchiseId: 'franchise-1',
      destinationAddressId: 'address-destination',
      pickupAddressId: 'address-pickup',
    });

    expect(delivery.status).toBe('pending');
    expect(delivery.orderId).toBe('order-1');
    expect(await repository.findById(delivery.id)).not.toBeNull();
  });

  it('lève DuplicateOrderError si une livraison existe déjà pour order_id', async () => {
    const existing = buildPendingDelivery({ orderId: 'order-1' });
    repository.deliveries.set(existing.id, existing);

    await expect(
      useCase.execute({
        orderId: 'order-1',
        customerId: 'customer-1',
        franchiseId: 'franchise-1',
        destinationAddressId: 'address-destination',
        pickupAddressId: null,
      }),
    ).rejects.toThrow(DuplicateOrderError);
  });
});
