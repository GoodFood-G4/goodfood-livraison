import { GeoPoint } from '../../shared/domain/geo-point';
import { Clock } from '../../shared/application/ports/clock.port';
import { IdGenerator } from '../../shared/application/ports/id-generator.port';
import { Address } from '../domain/address';
import { AddressRepository } from '../domain/address-repository.port';
import { Geocoder, GeocodeQuery } from '../domain/geocoder.port';
import { AddressNotGeocodableError } from '../domain/errors';
import { CreateAddressUseCase } from './create-address.use-case';

class InMemoryAddressRepository implements AddressRepository {
  readonly addresses = new Map<string, Address>();

  async save(address: Address): Promise<void> {
    this.addresses.set(address.id, address);
  }

  async findById(id: string): Promise<Address | null> {
    return this.addresses.get(id) ?? null;
  }
}

class FakeGeocoder implements Geocoder {
  result: GeoPoint | null = null;

  async geocode(_query: GeocodeQuery): Promise<GeoPoint | null> {
    return this.result;
  }
}

class FixedClock implements Clock {
  constructor(private readonly date: Date) {}
  now(): Date {
    return this.date;
  }
}

class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

describe('CreateAddressUseCase', () => {
  let repository: InMemoryAddressRepository;
  let geocoder: FakeGeocoder;
  let useCase: CreateAddressUseCase;

  beforeEach(() => {
    repository = new InMemoryAddressRepository();
    geocoder = new FakeGeocoder();
    useCase = new CreateAddressUseCase(
      repository,
      geocoder,
      new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
      new SequentialIdGenerator(),
    );
  });

  it('crée une adresse avec les coordonnées fournies, sans géocoder', async () => {
    const geocodeSpy = jest.spyOn(geocoder, 'geocode');

    const address = await useCase.execute({
      country: 'France',
      street: '2 Rue de Paris',
      postalCode: '76600',
      city: 'Le Havre',
      latitude: 49.4938,
      longitude: 0.1077,
      createdBy: 'user-1',
    });

    expect(address.location.latitude).toBe(49.4938);
    expect(address.location.longitude).toBe(0.1077);
    expect(geocodeSpy).not.toHaveBeenCalled();
    expect(await repository.findById(address.id)).not.toBeNull();
  });

  it("géocode quand aucune coordonnée n'est fournie", async () => {
    geocoder.result = GeoPoint.create(49.4938, 0.1077);

    const address = await useCase.execute({
      country: 'France',
      street: '2 Rue de Paris',
      postalCode: '76600',
      city: 'Le Havre',
      createdBy: null,
    });

    expect(address.location.latitude).toBe(49.4938);
    expect(address.createdBy).toBeNull();
  });

  it('lève AddressNotGeocodableError si le géocodage échoue', async () => {
    geocoder.result = null;

    await expect(
      useCase.execute({
        country: 'France',
        street: 'adresse inconnue',
        postalCode: '00000',
        city: 'Nulle part',
        createdBy: 'user-1',
      }),
    ).rejects.toThrow(AddressNotGeocodableError);
  });
});
