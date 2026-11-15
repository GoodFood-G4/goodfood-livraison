import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AddressOrmEntity } from '../../../address/infrastructure/persistence/address.orm-entity';
import { TypeOrmAddressRepository } from '../../../address/infrastructure/persistence/typeorm-address.repository';
import {
  TransactionalRepositories,
  UnitOfWork,
} from '../../application/unit-of-work.port';
import { DeliveryOrmEntity } from './delivery.orm-entity';
import { TypeOrmDeliveryRepository } from './typeorm-delivery.repository';

/**
 * Adaptateur TypeORM du port UnitOfWork : les repositories sont reconstruits
 * sur l'EntityManager de la transaction, donc toutes leurs requêtes (y compris
 * les `manager.query` bruts) passent par la même connexion.
 */
@Injectable()
export class TypeOrmUnitOfWork implements UnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(
    work: (repositories: TransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work({
        addresses: new TypeOrmAddressRepository(
          manager.getRepository(AddressOrmEntity),
        ),
        deliveries: new TypeOrmDeliveryRepository(
          manager.getRepository(DeliveryOrmEntity),
        ),
      }),
    );
  }
}
