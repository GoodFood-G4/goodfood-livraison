import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '../../domain/address';
import { AddressRepository } from '../../domain/address-repository.port';
import { AddressOrmEntity } from './address.orm-entity';
import { AddressMapper } from './address.mapper';

@Injectable()
export class TypeOrmAddressRepository implements AddressRepository {
  constructor(
    @InjectRepository(AddressOrmEntity)
    private readonly repository: Repository<AddressOrmEntity>,
  ) {}

  async save(address: Address): Promise<void> {
    await this.repository.save(AddressMapper.toOrm(address));
  }

  async findById(id: string): Promise<Address | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? AddressMapper.toDomain(entity) : null;
  }
}
