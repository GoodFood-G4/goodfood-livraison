import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Role } from '../../shared/application/actor';
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
  buildAddress,
  buildPendingDelivery,
} from '../application/test-doubles';
import { DuplicateOrderError } from '../domain/errors';
import { DeliveryController } from './delivery.controller';

const JWT_SECRET = 'test-secret';

describe('DeliveryController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const createDeliveryUseCase = { execute: jest.fn() };
  const listAvailableDeliveriesUseCase = { execute: jest.fn() };
  const acceptDeliveryUseCase = { execute: jest.fn() };
  const updateDeliveryStatusUseCase = { execute: jest.fn() };
  const updateCourierLocationUseCase = { execute: jest.fn() };
  const getDeliveryUseCase = { execute: jest.fn() };
  const listCourierHistoryUseCase = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: JWT_SECRET })],
      controllers: [DeliveryController],
      providers: [
        { provide: CreateDeliveryUseCase, useValue: createDeliveryUseCase },
        {
          provide: ListAvailableDeliveriesUseCase,
          useValue: listAvailableDeliveriesUseCase,
        },
        { provide: AcceptDeliveryUseCase, useValue: acceptDeliveryUseCase },
        {
          provide: UpdateDeliveryStatusUseCase,
          useValue: updateDeliveryStatusUseCase,
        },
        {
          provide: UpdateCourierLocationUseCase,
          useValue: updateCourierLocationUseCase,
        },
        { provide: GetDeliveryUseCase, useValue: getDeliveryUseCase },
        {
          provide: ListCourierHistoryUseCase,
          useValue: listCourierHistoryUseCase,
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

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  function tokenFor(role: Role, sub = 'user-1'): string {
    return jwtService.sign({ sub, role }, { algorithm: 'HS256' });
  }

  it('401 sans token', async () => {
    await request(app.getHttpServer()).get('/deliveries/any-id').expect(401);
  });

  it('401 si le token est expiré (claim exp dépassé)', async () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiredToken = jwtService.sign(
      {
        sub: '11111111-1111-4111-8111-111111111111',
        role: Role.COURIER,
        iat: nowInSeconds - 2 * 86400,
        exp: nowInSeconds - 86400,
      },
      { algorithm: 'HS256' },
    );

    await request(app.getHttpServer())
      .get('/deliveries/any-id')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
    expect(getDeliveryUseCase.execute).not.toHaveBeenCalled();
  });

  it("403 si le rôle est insuffisant (client sur POST /deliveries réservé à l'admin)", async () => {
    await request(app.getHttpServer())
      .post('/deliveries')
      .set('Authorization', `Bearer ${tokenFor(Role.CUSTOMER)}`)
      .send({
        order_id: '11111111-1111-4111-8111-111111111111',
        address_id: '22222222-2222-4222-8222-222222222222',
      })
      .expect(403);
  });

  it('400 en cas de validation échouée (order_id manquant)', async () => {
    await request(app.getHttpServer())
      .post('/deliveries')
      .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
      .send({ address_id: '22222222-2222-4222-8222-222222222222' })
      .expect(400);
  });

  it('accepte un body x-www-form-urlencoded sur POST /deliveries', async () => {
    createDeliveryUseCase.execute.mockResolvedValue(fakeDeliveryDomain());

    await request(app.getHttpServer())
      .post('/deliveries')
      .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
      .type('form')
      .send({
        order_id: '11111111-1111-4111-8111-111111111111',
        address_id: '22222222-2222-4222-8222-222222222222',
      })
      .expect(201);
  });

  it('409 quand order_id est déjà connu', async () => {
    createDeliveryUseCase.execute.mockRejectedValue(
      new DuplicateOrderError('order-1'),
    );

    await request(app.getHttpServer())
      .post('/deliveries')
      .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
      .send({
        order_id: '11111111-1111-4111-8111-111111111111',
        address_id: '22222222-2222-4222-8222-222222222222',
      })
      .expect(409);
  });

  it("GET /deliveries/available expose le retrait et la course, pas l'adresse du client", async () => {
    listAvailableDeliveriesUseCase.execute.mockResolvedValue([
      {
        delivery: buildPendingDelivery(),
        distanceKm: 0.456,
        pickupAddress: buildAddress({ id: 'address-pickup' }),
        tripDistanceKm: 1.2345,
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/deliveries/available?lat=49.4938&lng=0.1077')
      .set('Authorization', `Bearer ${tokenFor(Role.COURIER)}`)
      .expect(200);

    expect(response.body[0]).toMatchObject({
      distance_km: 0.46,
      trip_distance_km: 1.23,
      pickup_address: {
        id: 'address-pickup',
        street: '2 Rue de Paris',
        latitude: 49.4938,
        longitude: 0.1077,
      },
    });
    expect(response.body[0]).not.toHaveProperty('destination_address');
  });

  it("GET /deliveries/available n'est pas capturée par :id", async () => {
    listAvailableDeliveriesUseCase.execute.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/deliveries/available?lat=49.4938&lng=0.1077')
      .set('Authorization', `Bearer ${tokenFor(Role.COURIER)}`)
      .expect(200);

    expect(listAvailableDeliveriesUseCase.execute).toHaveBeenCalled();
    expect(getDeliveryUseCase.execute).not.toHaveBeenCalled();
  });

  it("GET /deliveries/history n'est pas capturée par :id", async () => {
    listCourierHistoryUseCase.execute.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });

    await request(app.getHttpServer())
      .get('/deliveries/history')
      .set('Authorization', `Bearer ${tokenFor(Role.COURIER)}`)
      .expect(200);

    expect(listCourierHistoryUseCase.execute).toHaveBeenCalled();
    expect(getDeliveryUseCase.execute).not.toHaveBeenCalled();
  });

  it('204 sur PATCH /deliveries/:id/location', async () => {
    updateCourierLocationUseCase.execute.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .patch('/deliveries/delivery-1/location')
      .set('Authorization', `Bearer ${tokenFor(Role.COURIER)}`)
      .send({ latitude: 49.4938, longitude: 0.1077 })
      .expect(204);
  });
});

function fakeDeliveryDomain() {
  return {
    id: 'delivery-1',
    orderId: 'order-1',
    customerId: null,
    franchiseId: null,
    destinationAddressId: 'address-1',
    pickupAddressId: null,
    status: 'pending',
    courierId: null,
    acceptedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}
