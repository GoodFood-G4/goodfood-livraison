import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Role } from '../../shared/application/actor';
import { toUtcIsoSeconds } from '../../shared/application/utc-date-format';
import { DomainErrorFilter } from '../../shared/presentation/filters/domain-error.filter';
import { JwtAuthGuard } from '../../shared/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/presentation/guards/roles.guard';
import { AcceptDeliveryUseCase } from '../application/accept-delivery.use-case';
import { CreateDeliveryUseCase } from '../application/create-delivery.use-case';
import { GetDeliveryUseCase } from '../application/get-delivery.use-case';
import { ListAvailableDeliveriesUseCase } from '../application/list-available-deliveries.use-case';
import { ListCourierHistoryUseCase } from '../application/list-courier-history.use-case';
import { UpdateCourierLocationUseCase } from '../application/update-courier-location.use-case';
import { UpdateDeliveryStatusUseCase } from '../application/update-delivery-status.use-case';
import {
  FakeDeliveryEventPublisher,
  InMemoryAddressRepository,
  InMemoryDeliveryRepository,
  buildAddress,
  buildPendingDelivery,
} from '../application/test-doubles';
import { Clock } from '../../shared/application/ports/clock.port';
import { DeliveryController } from './delivery.controller';

const JWT_SECRET = 'test-secret';
const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const COURIER = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/** Horloge qui avance d'une minute (avec millisecondes) à chaque appel. */
class TickingClock implements Clock {
  private current = new Date('2026-11-11T21:55:25.785Z').getTime();
  now(): Date {
    this.current += 60_000;
    return new Date(this.current);
  }
}

/**
 * Parcours HTTP complet avec les vrais use cases et des doublures en mémoire :
 * horodatages, format des dates, cohérence avec les événements, 404 / 403.
 */
describe('DeliveryController (cycle de vie, use cases réels)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let deliveries: InMemoryDeliveryRepository;
  let addresses: InMemoryAddressRepository;
  let publisher: FakeDeliveryEventPublisher;

  beforeEach(async () => {
    deliveries = new InMemoryDeliveryRepository();
    addresses = new InMemoryAddressRepository();
    publisher = new FakeDeliveryEventPublisher();
    const clock = new TickingClock();

    await addresses.save(buildAddress({ id: 'address-destination' }));
    await addresses.save(buildAddress({ id: 'address-pickup' }));
    const delivery = buildPendingDelivery({ customerId: CUSTOMER });
    await deliveries.save(delivery);

    const unused = { execute: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: JWT_SECRET })],
      controllers: [DeliveryController],
      providers: [
        { provide: CreateDeliveryUseCase, useValue: unused },
        { provide: ListAvailableDeliveriesUseCase, useValue: unused },
        { provide: ListCourierHistoryUseCase, useValue: unused },
        {
          provide: AcceptDeliveryUseCase,
          useValue: new AcceptDeliveryUseCase(deliveries, publisher, clock, 3),
        },
        {
          provide: UpdateDeliveryStatusUseCase,
          useValue: new UpdateDeliveryStatusUseCase(
            deliveries,
            publisher,
            clock,
          ),
        },
        {
          provide: UpdateCourierLocationUseCase,
          useValue: new UpdateCourierLocationUseCase(deliveries, clock),
        },
        {
          provide: GetDeliveryUseCase,
          useValue: new GetDeliveryUseCase(deliveries, addresses, 20),
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'jwtSecret' ? JWT_SECRET : undefined,
          },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_FILTER, useClass: DomainErrorFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = moduleRef.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  function auth(role: Role, sub: string): [string, string] {
    return [
      'Authorization',
      `Bearer ${jwtService.sign({ sub, role }, { algorithm: 'HS256' })}`,
    ];
  }

  const server = () => app.getHttpServer();
  const get = (role: Role, sub: string) =>
    request(server())
      .get('/deliveries/delivery-1')
      .set(...auth(role, sub));
  const advance = (status: string, sub = COURIER) =>
    request(server())
      .patch('/deliveries/delivery-1/status')
      .set(...auth(Role.COURIER, sub))
      .send({ status });
  const moveTo = (sub = COURIER) =>
    request(server())
      .patch('/deliveries/delivery-1/location')
      .set(...auth(Role.COURIER, sub))
      .send({ latitude: 49.49, longitude: 0.1 });

  it('expose les horodatages : null puis valorisés étape par étape, identiques aux événements', async () => {
    const pending = await get(Role.CUSTOMER, CUSTOMER).expect(200);
    expect(pending.body).toMatchObject({
      assigned_at: null,
      picked_up_at: null,
      started_at: null,
      completed_at: null,
    });

    await request(server())
      .patch('/deliveries/delivery-1/accept')
      .set(...auth(Role.COURIER, COURIER))
      .expect(200);
    await advance('picked_up').expect(200);
    const picked = await get(Role.CUSTOMER, CUSTOMER).expect(200);
    expect(picked.body.assigned_at).toMatch(UTC_SECONDS);
    expect(picked.body.picked_up_at).toMatch(UTC_SECONDS);
    expect(picked.body.started_at).toBeNull();
    expect(picked.body.completed_at).toBeNull();

    await advance('in_transit').expect(200);
    await advance('delivered').expect(200);
    const done = await get(Role.CUSTOMER, CUSTOMER).expect(200);

    const eventDates = publisher.published.map((event) =>
      toUtcIsoSeconds(event.payload.occurredAt),
    );
    expect(publisher.published.map((event) => event.event)).toEqual([
      'assigned',
      'picked_up',
      'started',
      'completed',
    ]);
    expect([
      done.body.assigned_at,
      done.body.picked_up_at,
      done.body.started_at,
      done.body.completed_at,
    ]).toEqual(eventDates);
  });

  it('formate toutes les dates en UTC à la seconde, terminées par Z (y compris courier_location)', async () => {
    await request(server())
      .patch('/deliveries/delivery-1/accept')
      .set(...auth(Role.COURIER, COURIER))
      .expect(200);
    await moveTo().expect(204);

    const { body } = await get(Role.COURIER, COURIER).expect(200);

    expect(body.created_at).toMatch(UTC_SECONDS);
    expect(body.updated_at).toMatch(UTC_SECONDS);
    expect(body.assigned_at).toMatch(UTC_SECONDS);
    expect(body.courier_location.updated_at).toMatch(UTC_SECONDS);
    expect(body.assigned_at).not.toContain('.');
  });

  it('409 avec un message exact pour une position envoyée après la livraison', async () => {
    await request(server())
      .patch('/deliveries/delivery-1/accept')
      .set(...auth(Role.COURIER, COURIER));
    await advance('picked_up');
    await advance('in_transit');
    await advance('delivered');

    const response = await moveTo().expect(409);

    expect(response.body.message).toBe(
      'La position ne peut plus être mise à jour : la livraison est terminée',
    );
    expect(response.body.error).toBe('LocationUpdateNotAllowedError');
  });

  describe("404 sur la livraison d'un autre utilisateur, 403 sur un rôle non autorisé", () => {
    beforeEach(async () => {
      await request(server())
        .patch('/deliveries/delivery-1/accept')
        .set(...auth(Role.COURIER, COURIER))
        .expect(200);
    });

    it('GET /deliveries/:id : 404 pour un autre client ou un autre livreur, même corps que « introuvable »', async () => {
      const other = await get(Role.CUSTOMER, OTHER).expect(404);
      await get(Role.COURIER, OTHER).expect(404);
      const missing = await request(server())
        .get('/deliveries/delivery-1-inconnue')
        .set(...auth(Role.CUSTOMER, OTHER))
        .expect(404);
      expect(other.body.error).toBe(missing.body.error);
    });

    it('PATCH /deliveries/:id/status : 404 pour un livreur non assigné, 403 pour un client', async () => {
      await advance('picked_up', OTHER).expect(404);
      await request(server())
        .patch('/deliveries/delivery-1/status')
        .set(...auth(Role.CUSTOMER, CUSTOMER))
        .send({ status: 'picked_up' })
        .expect(403);
    });

    it('PATCH /deliveries/:id/location : 404 pour un livreur non assigné, 403 pour un client', async () => {
      await moveTo(OTHER).expect(404);
      await request(server())
        .patch('/deliveries/delivery-1/location')
        .set(...auth(Role.CUSTOMER, CUSTOMER))
        .send({ latitude: 49.49, longitude: 0.1 })
        .expect(403);
    });

    it('PATCH /deliveries/:id/accept : 409 si déjà assignée à un autre livreur, 403 pour un client', async () => {
      await request(server())
        .patch('/deliveries/delivery-1/accept')
        .set(...auth(Role.COURIER, OTHER))
        .expect(409);
      await request(server())
        .patch('/deliveries/delivery-1/accept')
        .set(...auth(Role.CUSTOMER, CUSTOMER))
        .expect(403);
    });
  });
});
