import { GeoPoint } from '../../shared/domain/geo-point';
import { Address } from './address';

describe('Address', () => {
  it('expose tous ses champs tels que construits (snapshot immuable)', () => {
    const location = GeoPoint.create(49.4938, 0.1077);
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    const address = Address.create({
      id: 'address-1',
      country: 'France',
      street: '2 Rue de Paris',
      postalCode: '76600',
      city: 'Le Havre',
      location,
      createdBy: 'user-1',
      createdAt,
    });

    expect(address.id).toBe('address-1');
    expect(address.country).toBe('France');
    expect(address.street).toBe('2 Rue de Paris');
    expect(address.postalCode).toBe('76600');
    expect(address.city).toBe('Le Havre');
    expect(address.location).toBe(location);
    expect(address.createdBy).toBe('user-1');
    expect(address.createdAt).toBe(createdAt);
  });

  it('autorise un créateur nul (snapshot restaurant, par exemple)', () => {
    const address = Address.create({
      id: 'address-2',
      country: 'France',
      street: '10 Rue du Restaurant',
      postalCode: '76600',
      city: 'Le Havre',
      location: GeoPoint.create(49.5, 0.12),
      createdBy: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(address.createdBy).toBeNull();
  });
});
