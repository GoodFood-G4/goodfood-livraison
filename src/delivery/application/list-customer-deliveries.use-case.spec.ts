import { ListCustomerDeliveriesUseCase } from './list-customer-deliveries.use-case';
import {
  InMemoryDeliveryRepository,
  buildPendingDelivery,
} from './test-doubles';

describe('ListCustomerDeliveriesUseCase', () => {
  const setup = () => {
    const repository = new InMemoryDeliveryRepository();
    const useCase = new ListCustomerDeliveriesUseCase(repository);
    const deliveries = [
      buildPendingDelivery({
        id: 'delivery-older',
        orderId: 'order-older',
        customerId: 'customer-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      buildPendingDelivery({
        id: 'delivery-newer',
        orderId: 'order-newer',
        customerId: 'customer-1',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
      buildPendingDelivery({
        id: 'delivery-other-customer',
        orderId: 'order-other',
        customerId: 'customer-2',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      }),
      buildPendingDelivery({
        id: 'delivery-no-customer',
        orderId: 'order-anonymous',
        customerId: null,
        createdAt: new Date('2026-01-04T00:00:00.000Z'),
      }),
    ];
    deliveries.forEach((d) => repository.deliveries.set(d.id, d));
    return useCase;
  };

  it('ne renvoie que les livraisons du client, plus récentes en premier', async () => {
    const result = await setup().execute({
      customerId: 'customer-1',
      page: 1,
      limit: 20,
    });

    expect(result.data.map((d) => d.id)).toEqual([
      'delivery-newer',
      'delivery-older',
    ]);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 2 });
  });

  it('pagine', async () => {
    const result = await setup().execute({
      customerId: 'customer-1',
      page: 2,
      limit: 1,
    });

    expect(result.data.map((d) => d.id)).toEqual(['delivery-older']);
    expect(result.meta).toEqual({ page: 2, limit: 1, total: 2 });
  });

  it('client sans livraison : liste vide', async () => {
    const result = await setup().execute({
      customerId: 'customer-3',
      page: 1,
      limit: 20,
    });

    expect(result).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
  });
});
