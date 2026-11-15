import { Logger } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';
import { QueryFailedError } from 'typeorm';
import { OrderReadyConsumer, REQUEUE_DELAY_MS } from './order-ready.consumer';

function buildMessage(payload: unknown, redelivered = false): ConsumeMessage {
  return {
    content: Buffer.from(JSON.stringify(payload)),
    fields: { redelivered },
  } as unknown as ConsumeMessage;
}

/** Erreur telle que levée par `pg` quand PostgreSQL est injoignable. */
function connectionRefusedError(): Error {
  return Object.assign(new Error('connect ECONNREFUSED 172.18.0.3:5432'), {
    code: 'ECONNREFUSED',
  });
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

  it('accepte une date ready_at en UTC terminée par Z, sans millisecondes', async () => {
    useCase.execute.mockResolvedValue({ created: true, delivery: { id: 'd' } });

    await consumeHandler(
      buildMessage({ ...validPayload(), ready_at: '2026-11-11T21:29:07Z' }),
    );

    expect(channel.ack).toHaveBeenCalled();
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it("logue en INFO la création (order_id, delivery_id) sans l'adresse postale", async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    useCase.execute.mockResolvedValue({
      created: true,
      delivery: { id: 'delivery-42' },
    });

    await consumeHandler(buildMessage(validPayload()));

    const logged = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).toContain(`order_id=${validPayload().order_id}`);
    expect(logged).toContain('delivery_id=delivery-42');
    expect(logged).not.toContain('Rue');
    logSpy.mockRestore();
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

  describe('validation : rejet sans requeue (→ livraison.dlq)', () => {
    const withoutKey = (key: string) => {
      const payload: Record<string, unknown> = validPayload();
      delete payload[key];
      return payload;
    };

    it.each([
      ['sans pickup_address', withoutKey('pickup_address')],
      ['sans delivery_address', withoutKey('delivery_address')],
      ['pickup_address null', { ...validPayload(), pickup_address: null }],
      ['pickup_address non objet', { ...validPayload(), pickup_address: 'x' }],
      ['pickup_address tableau', { ...validPayload(), pickup_address: [] }],
      ...(['country', 'street', 'postal_code', 'city'] as const).map(
        (field) => {
          const pickup: Record<string, unknown> = {
            ...validPayload().pickup_address,
          };
          delete pickup[field];
          return [
            `adresse incomplète (sans ${field})`,
            { ...validPayload(), pickup_address: pickup },
          ] as [string, unknown];
        },
      ),
      ...(['order_id', 'user_id', 'franchise_id', 'ready_at'] as const).map(
        (field) => [`sans ${field}`, withoutKey(field)] as [string, unknown],
      ),
      ['order_id de mauvais type', { ...validPayload(), order_id: 42 }],
      [
        'latitude de mauvais type',
        {
          ...validPayload(),
          delivery_address: {
            ...validPayload().delivery_address,
            latitude: '49.49',
          },
        },
      ],
      ['ready_at non ISO 8601', { ...validPayload(), ready_at: 'hier' }],
      ['JSON non objet', null],
    ])('%s', async (_label, payload) => {
      await consumeHandler(buildMessage(payload));

      expect(useCase.execute).not.toHaveBeenCalled();
      expect(channel.ack).not.toHaveBeenCalled();
      expect(channel.nack).toHaveBeenCalledWith(
        expect.anything(),
        false,
        false,
      );
    });
  });

  describe('classification des erreurs de traitement', () => {
    afterEach(() => jest.useRealTimers());

    it('TypeError (erreur de programmation) : nack sans requeue + log ERROR avec order_id', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      useCase.execute.mockRejectedValue(
        new TypeError(
          "Cannot read properties of undefined (reading 'country')",
        ),
      );

      await consumeHandler(buildMessage(validPayload()));

      expect(channel.nack).toHaveBeenCalledWith(
        expect.anything(),
        false,
        false,
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(`order_id=${validPayload().order_id}.*reading 'country'`),
        ),
      );
      errorSpy.mockRestore();
    });

    it('erreur inconnue sans code : nack sans requeue (jamais de remise en file par défaut)', async () => {
      useCase.execute.mockRejectedValue(new Error('quelque chose de bizarre'));

      await consumeHandler(buildMessage(validPayload()));

      expect(channel.nack).toHaveBeenCalledWith(
        expect.anything(),
        false,
        false,
      );
    });

    it(`connexion base refusée : nack avec requeue après ${REQUEUE_DELAY_MS} ms`, async () => {
      jest.useFakeTimers();
      useCase.execute.mockRejectedValue(connectionRefusedError());

      const handling = consumeHandler(buildMessage(validPayload()));
      await jest.advanceTimersByTimeAsync(REQUEUE_DELAY_MS - 1);
      expect(channel.nack).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      await handling;
      expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, true);
    });

    it('QueryFailedError avec SQLSTATE de connexion (08006) : requeue', async () => {
      jest.useFakeTimers();
      useCase.execute.mockRejectedValue(
        new QueryFailedError('SELECT 1', [], {
          code: '08006',
          message: 'connection failure',
        } as never),
      );

      const handling = consumeHandler(buildMessage(validPayload()));
      await jest.advanceTimersByTimeAsync(REQUEUE_DELAY_MS);
      await handling;
      expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, true);
    });

    it('erreur de connexion persistante sur un message redelivered : nack sans requeue, sans attendre', async () => {
      jest.useFakeTimers();
      useCase.execute.mockRejectedValue(connectionRefusedError());

      await consumeHandler(buildMessage(validPayload(), true));

      expect(channel.nack).toHaveBeenCalledWith(
        expect.anything(),
        false,
        false,
      );
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
