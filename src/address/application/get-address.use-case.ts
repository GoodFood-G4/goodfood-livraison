import { Inject, Injectable } from '@nestjs/common';
import { Actor, Role } from '../../shared/application/actor';
import { Address } from '../domain/address';
import {
  AddressRepository,
  ADDRESS_REPOSITORY,
} from '../domain/address-repository.port';
import { AddressNotFoundError, NotAddressOwnerError } from '../domain/errors';

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

    if (!address) {
      throw new AddressNotFoundError(input.addressId);
    }

    const isOwner = address.createdBy === input.actor.userId;
    const isAdmin = input.actor.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new NotAddressOwnerError();
    }

    return address;
  }
}
