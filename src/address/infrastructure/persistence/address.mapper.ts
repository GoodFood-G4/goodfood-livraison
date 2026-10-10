import { GeoPoint } from '../../../shared/domain/geo-point';
import { Address } from '../../domain/address';
import { AddressOrmEntity } from './address.orm-entity';

export class AddressMapper {
  static toDomain(entity: AddressOrmEntity): Address {
    return Address.create({
      id: entity.id,
      country: entity.country,
      street: entity.street,
      postalCode: entity.postalCode,
      city: entity.city,
      location: GeoPoint.create(entity.latitude, entity.longitude),
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
    });
  }

  static toOrm(address: Address): AddressOrmEntity {
    const entity = new AddressOrmEntity();
    entity.id = address.id;
    entity.country = address.country;
    entity.street = address.street;
    entity.postalCode = address.postalCode;
    entity.city = address.city;
    entity.latitude = address.location.latitude;
    entity.longitude = address.location.longitude;
    entity.createdBy = address.createdBy;
    entity.createdAt = address.createdAt;
    return entity;
  }
}
