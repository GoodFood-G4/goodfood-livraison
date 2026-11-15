import { Inject, Injectable } from '@nestjs/common';
import { Actor, Role } from '../../shared/application/actor';
import { Address } from '../domain/address';
import {
  AddressRepository,
  ADDRESS_REPOSITORY,
} from '../domain/address-repository.port';
import { AddressNotFoundError } from '../domain/errors';

export interface GetAddressInput {
  readonly addressId: string;
  readonly actor: Actor;
}

@Injectable()
export class GetAddressUseCase {
  constructor(
    @Inject(ADDRESS_REPOSITORY)
    private readonly addressRepository: AddressRepository,
  ) {}

  async execute(input: GetAddressInput): Promise<Address> {
    const address = await this.addressRepository.findById(input.addressId);

    const isOwner = address?.createdBy === input.actor.userId;
    const isAdmin = input.actor.role === Role.ADMIN;

    // L'adresse d'un autre utilisateur est traitée comme introuvable (404) :
    // on ne révèle pas son existence.
    if (!address || (!isOwner && !isAdmin)) {
      throw new AddressNotFoundError(input.addressId);
    }

    return address;
  }
}
