import { ListCourierHistoryUseCase } from './list-courier-history.use-case';
import {
  InMemoryDeliveryRepository,
  buildPendingDelivery,
} from './test-doubles';

describe('ListCourierHistoryUseCase', () => {
  it('retourne les livraisons du livreur, paginées, plus récentes en premier', async () => {
    const repository = new InMemoryDeliveryRepository();
    const useCase = new ListCourierHistoryUseCase(repository);

    const older = buildPendingDelivery({
      id: 'delivery-older',
      orderId: 'order-older',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    older.accept('courier-1', new Date('2026-01-01T00:00:00.000Z'));

    const newer = buildPendingDelivery({
      id: 'delivery-newer',
      orderId: 'order-newer',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    newer.accept('courier-1', new Date('2026-01-02T00:00:00.000Z'));

    const otherCourier = buildPendingDelivery({
      id: 'delivery-other',
      orderId: 'order-other',
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
    });
    otherCourier.accept('courier-2', new Date('2026-01-03T00:00:00.000Z'));

    repository.deliveries.set(older.id, older);
    repository.deliveries.set(newer.id, newer);
    repository.deliveries.set(otherCourier.id, otherCourier);

    const result = await useCase.execute({
      courierId: 'courier-1',
      page: 1,
      limit: 20,
    });

    expect(result.data.map((d) => d.id)).toEqual([
      'delivery-newer',
      'delivery-older',
    ]);
    expect(result.meta.total).toBe(2);
  });
});
