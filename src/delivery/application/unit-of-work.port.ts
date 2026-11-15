import { AddressRepository } from '../../address/domain/address-repository.port';
import { DeliveryRepository } from '../domain/delivery-repository.port';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/**
 * Repositories liés à une même transaction : toute écriture faite via ces
 * instances est validée ou annulée en bloc.
 */
export interface TransactionalRepositories {
  readonly addresses: AddressRepository;
  readonly deliveries: DeliveryRepository;
}

/**
 * Exécute `work` dans une transaction unique : commit si la promesse est
 * résolue, rollback (et propagation de l'erreur) si elle est rejetée.
 * Ne jamais y faire d'appel réseau lent (géocodage…) : la transaction
 * resterait ouverte pendant ce temps.
 */
export interface UnitOfWork {
  run<T>(
    work: (repositories: TransactionalRepositories) => Promise<T>,
  ): Promise<T>;
}
