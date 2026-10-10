import { GeoPoint } from '../../shared/domain/geo-point';
import { Role } from '../../shared/application/actor';
import { Address } from '../domain/address';
import { AddressRepository } from '../domain/address-repository.port';
import { AddressNotFoundError, NotAddressOwnerError } from '../domain/errors';
import { GetAddressUseCase } from './get-address.use-case';

class InMemoryAddressRepository implements AddressRepository {
  readonly addresses = new Map<string, Address>();

  async save(address: Address): Promise<void> {
    this.addresses.set(address.id, address);
  }

  async findById(id: string): Promise<Address | null> {
    return this.addresses.get(id) ?? null;
  }
}

function buildAddress(createdBy: string | null): Address {
  return Address.create({
    id: 'address-1',
    country: 'France',
    street: '2 Rue de Paris',
    postalCode: '76600',
    city: 'Le Havre',
    location: GeoPoint.create(49.4938, 0.1077),
    createdBy,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('GetAddressUseCase', () => {
  let repository: InMemoryAddressRepository;
  let useCase: GetAddressUseCase;

  beforeEach(() => {
    repository = new InMemoryAddressRepository();
    useCase = new GetAddressUseCase(repository);
  });

  it("retourne l'adresse pour son créateur", async () => {
    const address = buildAddress('user-1');
    await repository.save(address);

    const result = await useCase.execute({
      addressId: 'address-1',
      actor: { userId: 'user-1', role: Role.CUSTOMER },
    });

    expect(result.id).toBe('address-1');
  });

  it("retourne l'adresse pour un admin, même sans en être le créateur", async () => {
    await repository.save(buildAddress('user-1'));

    const result = await useCase.execute({
      addressId: 'address-1',
      actor: { userId: 'admin-1', role: Role.ADMIN },
    });

    expect(result.id).toBe('address-1');
  });

  it("refuse l'accès à un autre utilisateur", async () => {
    await repository.save(buildAddress('user-1'));

    await expect(
      useCase.execute({
        addressId: 'address-1',
        actor: { userId: 'user-2', role: Role.CUSTOMER },
      }),
    ).rejects.toThrow(NotAddressOwnerError);
  });

  it('lève AddressNotFoundError si absente', async () => {
    await expect(
      useCase.execute({
        addressId: 'inconnue',
        actor: { userId: 'user-1', role: Role.CUSTOMER },
      }),
    ).rejects.toThrow(AddressNotFoundError);
  });
});
