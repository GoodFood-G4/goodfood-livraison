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
import { CreateAddressUseCase } from '../application/create-address.use-case';
import { GetAddressUseCase } from '../application/get-address.use-case';
import {
  AddressNotGeocodableError,
  NotAddressOwnerError,
} from '../domain/errors';
import { AddressController } from './address.controller';

const JWT_SECRET = 'test-secret';

describe('AddressController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const createAddressUseCase = { execute: jest.fn() };
  const getAddressUseCase = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: JWT_SECRET })],
      controllers: [AddressController],
      providers: [
        { provide: CreateAddressUseCase, useValue: createAddressUseCase },
        { provide: GetAddressUseCase, useValue: getAddressUseCase },
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
    await request(app.getHttpServer()).get('/addresses/address-1').expect(401);
  });

  it('400 en cas de validation échouée', async () => {
    await request(app.getHttpServer())
      .post('/addresses')
      .set('Authorization', `Bearer ${tokenFor(Role.CUSTOMER)}`)
      .send({ country: 'France' })
      .expect(400);
  });

  it('201 à la création avec coordonnées fournies', async () => {
    createAddressUseCase.execute.mockResolvedValue(fakeAddressDomain());

    await request(app.getHttpServer())
      .post('/addresses')
      .set('Authorization', `Bearer ${tokenFor(Role.CUSTOMER)}`)
      .send({
        country: 'France',
        street: '2 Rue de Paris',
        postal_code: '76600',
        city: 'Le Havre',
        latitude: 49.4938,
        longitude: 0.1077,
      })
      .expect(201);
  });

  it('422 si adresse non géocodable', async () => {
    createAddressUseCase.execute.mockRejectedValue(
      new AddressNotGeocodableError(),
    );

    await request(app.getHttpServer())
      .post('/addresses')
      .set('Authorization', `Bearer ${tokenFor(Role.CUSTOMER)}`)
      .send({
        country: 'France',
        street: 'inconnue',
        postal_code: '00000',
        city: 'Nulle part',
      })
      .expect(422);
  });

  it("403 si l'actor n'est pas le créateur de l'adresse", async () => {
    getAddressUseCase.execute.mockRejectedValue(new NotAddressOwnerError());

    await request(app.getHttpServer())
      .get('/addresses/address-1')
      .set('Authorization', `Bearer ${tokenFor(Role.CUSTOMER)}`)
      .expect(403);
  });
});

function fakeAddressDomain() {
  return {
    id: 'address-1',
    country: 'France',
    street: '2 Rue de Paris',
    postalCode: '76600',
    city: 'Le Havre',
    location: { latitude: 49.4938, longitude: 0.1077 },
    createdBy: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}
