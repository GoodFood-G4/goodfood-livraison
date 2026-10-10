import { Address } from './address';

export const ADDRESS_REPOSITORY = Symbol('ADDRESS_REPOSITORY');

export interface AddressRepository {
  save(address: Address): Promise<void>;
  findById(id: string): Promise<Address | null>;
}
