import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../shared/shared.module';
import { ADDRESS_REPOSITORY } from './domain/address-repository.port';
import { GEOCODER } from './domain/geocoder.port';
import { CreateAddressUseCase } from './application/create-address.use-case';
import { GetAddressUseCase } from './application/get-address.use-case';
import { AddressOrmEntity } from './infrastructure/persistence/address.orm-entity';
import { TypeOrmAddressRepository } from './infrastructure/persistence/typeorm-address.repository';
import { NominatimGeocoder } from './infrastructure/geocoding/nominatim.geocoder';
import { AddressController } from './presentation/address.controller';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([AddressOrmEntity])],
  controllers: [AddressController],
  providers: [
    CreateAddressUseCase,
    GetAddressUseCase,
    { provide: ADDRESS_REPOSITORY, useClass: TypeOrmAddressRepository },
    { provide: GEOCODER, useClass: NominatimGeocoder },
  ],
  exports: [
    CreateAddressUseCase,
    GetAddressUseCase,
    ADDRESS_REPOSITORY,
    GEOCODER,
  ],
})
export class AddressModule {}
