import { Logger } from '@nestjs/common';
import { RabbitMqDeliveryEventPublisher } from './rabbitmq-delivery-event-publisher';

describe('RabbitMqDeliveryEventPublisher', () => {
  let channelWrapper: { publish: jest.Mock };
  let publisher: RabbitMqDeliveryEventPublisher;

  const payload = {
    deliveryId: '11111111-1111-4111-8111-111111111111',
    orderId: '22222222-2222-4222-8222-222222222222',
    customerId: '33333333-3333-4333-8333-333333333333',
    courierId: '44444444-4444-4444-8444-444444444444',
    occurredAt: new Date('2026-11-11T21:29:07.123Z'),
  };

  beforeEach(() => {
    channelWrapper = { publish: jest.fn().mockResolvedValue(true) };
    publisher = new RabbitMqDeliveryEventPublisher(channelWrapper as never);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['publishAssigned', 'delivery.assigned', 'assigned_at'],
    ['publishPickedUp', 'delivery.picked_up', 'picked_up_at'],
    ['publishStarted', 'delivery.started', 'started_at'],
    ['publishCompleted', 'delivery.completed', 'completed_at'],
  ] as const)(
    '%s publie %s avec le payload du contrat',
    async (method, routingKey, dateField) => {
      await publisher[method](payload);

      const [exchange, key, content, options] =
        channelWrapper.publish.mock.calls[0];
      expect(exchange).toBe('goodfood.events');
      expect(key).toBe(routingKey);
      expect(options).toEqual({
        persistent: true,
        contentType: 'application/json',
      });
      expect(JSON.parse(content.toString())).toEqual({
        delivery_id: payload.deliveryId,
        order_id: payload.orderId,
        courier_id: payload.courierId,
        [dateField]: '2026-11-11T21:29:07Z',
      });
    },
  );

  it('logue en INFO chaque événement publié', async () => {
    await publisher.publishAssigned(payload);

    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('delivery.assigned'),
    );
  });

  it('ne rejette jamais si RabbitMQ est indisponible (best effort)', async () => {
    channelWrapper.publish.mockRejectedValue(new Error('broker down'));

    await expect(publisher.publishCompleted(payload)).resolves.toBeUndefined();
    expect(Logger.prototype.warn).toHaveBeenCalled();
  });
});
