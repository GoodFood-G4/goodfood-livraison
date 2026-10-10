import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../shared/presentation/decorators/current-actor.decorator';
import { Actor } from '../../shared/application/actor';
import { CreateAddressUseCase } from '../application/create-address.use-case';
import { GetAddressUseCase } from '../application/get-address.use-case';
import { CreateAddressDto } from './dto/create-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('addresses')
export class AddressController {
  constructor(
    private readonly createAddressUseCase: CreateAddressUseCase,
    private readonly getAddressUseCase: GetAddressUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: 201, description: 'Adresse créée (avec coordonnées)' })
  @ApiResponse({ status: 422, description: 'Adresse non géocodable' })
  async create(
    @Body() dto: CreateAddressDto,
    @CurrentActor() actor: Actor,
  ): Promise<AddressResponseDto> {
    const address = await this.createAddressUseCase.execute({
      country: dto.country,
      street: dto.street,
      postalCode: dto.postal_code,
      city: dto.city,
      latitude: dto.latitude,
      longitude: dto.longitude,
      createdBy: actor.userId,
    });
    return AddressResponseDto.fromDomain(address);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Adresse' })
  @ApiResponse({ status: 403, description: "Pas le créateur de l'adresse" })
  @ApiResponse({ status: 404, description: 'Adresse introuvable' })
  async findOne(
    @Param('id') id: string,
    @CurrentActor() actor: Actor,
  ): Promise<AddressResponseDto> {
    const address = await this.getAddressUseCase.execute({
      addressId: id,
      actor,
    });
    return AddressResponseDto.fromDomain(address);
  }
}
