import type { ConsumeMessage } from 'amqplib';
import { OrderReadyConsumer } from './order-ready.consumer';

function buildMessage(payload: unknown): ConsumeMessage {
  return { content: Buffer.from(JSON.stringify(payload)) } as ConsumeMessage;
}

function validPayload() {
  return {
    order_id: '11111111-1111-4111-8111-111111111111',
    user_id: '22222222-2222-4222-8222-222222222222',
    franchise_id: '33333333-3333-4333-8333-333333333333',
    delivery_address: {
      country: 'France',
      street: '2 Rue de Paris',
      postal_code: '76600',
      city: 'Le Havre',
      latitude: 49.4938,
      longitude: 0.1077,
    },
    pickup_address: {
      country: 'France',
      street: '10 Rue du Restaurant',
      postal_code: '76600',
      city: 'Le Havre',
    },
    ready_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('OrderReadyConsumer', () => {
  let channel: { ack: jest.Mock; nack: jest.Mock };
  let consumeHandler: (message: ConsumeMessage | null) => Promise<void>;
  let useCase: { execute: jest.Mock };
  let consumer: OrderReadyConsumer;

  beforeEach(async () => {
    channel = { ack: jest.fn(), nack: jest.fn() };
    const channelWrapper = {
      addSetup: jest.fn(
        async (setupFn: (channel: unknown) => Promise<void>) => {
          await setupFn({
            ...channel,
            consume: (
              _queue: string,
              handler: (message: ConsumeMessage | null) => Promise<void>,
            ) => {
              consumeHandler = handler;
            },
          });
        },
      ),
    };
    useCase = { execute: jest.fn() };

    consumer = new OrderReadyConsumer(
      channelWrapper as never,
      useCase as never,
    );
    await consumer.onModuleInit();
  });

  it('traite un message valide : exécute le use case et acquitte', async () => {
    useCase.execute.mockResolvedValue({ created: true, delivery: {} });

    await consumeHandler(buildMessage(validPayload()));

    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: validPayload().order_id }),
    );
    expect(channel.ack).toHaveBeenCalled();
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('acquitte sans erreur un doublon (idempotence)', async () => {
    useCase.execute.mockResolvedValue({ created: false, delivery: null });

    await consumeHandler(buildMessage(validPayload()));

    expect(channel.ack).toHaveBeenCalled();
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('rejette sans requeue un payload invalide', async () => {
    await consumeHandler(buildMessage({ order_id: 'pas-un-uuid' }));

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
  });

  it('rejette sans requeue un JSON illisible', async () => {
    const message = {
      content: Buffer.from('{ceci-nest-pas-du-json'),
    } as ConsumeMessage;

    await consumeHandler(message);

    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
  });

  it('rejette sans requeue si adresse non géocodable', async () => {
    const { AddressNotGeocodableError } =
      await import('../../../address/domain/errors');
    useCase.execute.mockRejectedValue(new AddressNotGeocodableError());

    await consumeHandler(buildMessage(validPayload()));

    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
  });

  it("requeue en cas d'erreur infrastructure transitoire", async () => {
    useCase.execute.mockRejectedValue(
      new Error('connexion base de données perdue'),
    );

    await consumeHandler(buildMessage(validPayload()));

    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, true);
  });
});
