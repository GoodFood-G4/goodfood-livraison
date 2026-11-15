import { Inject, Injectable } from '@nestjs/common';
import { Clock, CLOCK } from '../../shared/application/ports/clock.port';
import {
  IdGenerator,
  ID_GENERATOR,
} from '../../shared/application/ports/id-generator.port';
import { Address } from '../domain/address';
import {
  AddressRepository,
  ADDRESS_REPOSITORY,
} from '../domain/address-repository.port';
import { Geocoder, GEOCODER } from '../domain/geocoder.port';
import { resolveAddressLocation } from './resolve-address-location';

export interface CreateAddressInput {
  readonly country: string;
  readonly street: string;
  readonly postalCode: string;
  readonly city: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly createdBy: string | null;
}

@Injectable()
export class CreateAddressUseCase {
  constructor(
    @Inject(ADDRESS_REPOSITORY)
    private readonly addressRepository: AddressRepository,
    @Inject(GEOCODER) private readonly geocoder: Geocoder,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: CreateAddressInput): Promise<Address> {
    const location = await resolveAddressLocation(this.geocoder, input);

    const address = Address.create({
      id: this.idGenerator.generate(),
      country: input.country,
      street: input.street,
      postalCode: input.postalCode,
      city: input.city,
      location,
      createdBy: input.createdBy,
      createdAt: this.clock.now(),
    });

    await this.addressRepository.save(address);

    return address;
  }
}
