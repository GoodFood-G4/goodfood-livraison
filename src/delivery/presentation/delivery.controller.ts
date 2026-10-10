import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../shared/presentation/decorators/current-actor.decorator';
import { Roles } from '../../shared/presentation/decorators/roles.decorator';
import { Actor, Role } from '../../shared/application/actor';
import { AcceptDeliveryUseCase } from '../application/accept-delivery.use-case';
import { CreateDeliveryUseCase } from '../application/create-delivery.use-case';
import { GetDeliveryUseCase } from '../application/get-delivery.use-case';
import { ListAvailableDeliveriesUseCase } from '../application/list-available-deliveries.use-case';
import { ListCourierHistoryUseCase } from '../application/list-courier-history.use-case';
import { UpdateCourierLocationUseCase } from '../application/update-courier-location.use-case';
import { UpdateDeliveryStatusUseCase } from '../application/update-delivery-status.use-case';
import { AvailableDeliveryResponseDto } from './dto/available-delivery-response.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryDetailResponseDto } from './dto/delivery-detail-response.dto';
import { DeliveryHistoryResponseDto } from './dto/delivery-history-response.dto';
import { DeliveryResponseDto } from './dto/delivery-response.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { ListAvailableQueryDto } from './dto/list-available-query.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

const DEFAULT_HISTORY_PAGE = 1;
const DEFAULT_HISTORY_LIMIT = 20;

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('deliveries')
export class DeliveryController {
  constructor(
    private readonly createDeliveryUseCase: CreateDeliveryUseCase,
    private readonly listAvailableDeliveriesUseCase: ListAvailableDeliveriesUseCase,
    private readonly acceptDeliveryUseCase: AcceptDeliveryUseCase,
    private readonly updateDeliveryStatusUseCase: UpdateDeliveryStatusUseCase,
    private readonly updateCourierLocationUseCase: UpdateCourierLocationUseCase,
    private readonly getDeliveryUseCase: GetDeliveryUseCase,
    private readonly listCourierHistoryUseCase: ListCourierHistoryUseCase,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: 201, description: 'Livraison créée' })
  @ApiResponse({ status: 409, description: 'order_id déjà connu' })
  async create(@Body() dto: CreateDeliveryDto): Promise<DeliveryResponseDto> {
    const delivery = await this.createDeliveryUseCase.execute({
      orderId: dto.order_id,
      customerId: dto.customer_id ?? null,
      franchiseId: dto.franchise_id ?? null,
      destinationAddressId: dto.address_id,
      pickupAddressId: dto.pickup_address_id ?? null,
    });
    return DeliveryResponseDto.fromDomain(delivery);
  }

  // Doit être déclaré avant @Get(':id') pour ne pas être capturé par celui-ci.
  @Get('available')
  @Roles(Role.COURIER)
  @ApiResponse({
    status: 200,
    description: 'Livraisons pending dans le rayon, triées par distance',
  })
  async listAvailable(
    @Query() query: ListAvailableQueryDto,
  ): Promise<AvailableDeliveryResponseDto[]> {
    const results = await this.listAvailableDeliveriesUseCase.execute({
      latitude: query.lat,
      longitude: query.lng,
      radiusKm: query.radius,
    });
    return results.map((result) =>
      AvailableDeliveryResponseDto.fromResult(result),
    );
  }

  // Doit être déclaré avant @Get(':id') pour ne pas être capturé par celui-ci.
  @Get('history')
  @Roles(Role.COURIER)
  @ApiResponse({
    status: 200,
    description: 'Historique paginé du livreur connecté',
  })
  async history(
    @Query() query: HistoryQueryDto,
    @CurrentActor() actor: Actor,
  ): Promise<DeliveryHistoryResponseDto> {
    const paginated = await this.listCourierHistoryUseCase.execute({
      courierId: actor.userId,
      page: query.page ?? DEFAULT_HISTORY_PAGE,
      limit: query.limit ?? DEFAULT_HISTORY_LIMIT,
    });
    return DeliveryHistoryResponseDto.fromPaginated(paginated);
  }

  @Patch(':id/accept')
  @Roles(Role.COURIER)
  @ApiResponse({ status: 200, description: 'Livraison acceptée' })
  @ApiResponse({
    status: 409,
    description: 'Déjà assignée ou livreur trop chargé',
  })
  async accept(
    @Param('id') id: string,
    @CurrentActor() actor: Actor,
  ): Promise<DeliveryResponseDto> {
    const delivery = await this.acceptDeliveryUseCase.execute({
      deliveryId: id,
      courierId: actor.userId,
    });
    return DeliveryResponseDto.fromDomain(delivery);
  }

  @Patch(':id/status')
  @Roles(Role.COURIER)
  @ApiResponse({ status: 200, description: 'Statut mis à jour' })
  @ApiResponse({ status: 409, description: 'Transition de statut invalide' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentActor() actor: Actor,
  ): Promise<DeliveryResponseDto> {
    const delivery = await this.updateDeliveryStatusUseCase.execute({
      deliveryId: id,
      courierId: actor.userId,
      status: dto.status,
    });
    return DeliveryResponseDto.fromDomain(delivery);
  }

  @Patch(':id/location')
  @Roles(Role.COURIER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Position mise à jour' })
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    await this.updateCourierLocationUseCase.execute({
      deliveryId: id,
      courierId: actor.userId,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Statut, adresses, position et ETA',
  })
  @ApiResponse({
    status: 403,
    description: 'Pas autorisé à consulter cette livraison',
  })
  @ApiResponse({ status: 404, description: 'Livraison introuvable' })
  async findOne(
    @Param('id') id: string,
    @CurrentActor() actor: Actor,
  ): Promise<DeliveryDetailResponseDto> {
    const details = await this.getDeliveryUseCase.execute({
      deliveryId: id,
      actor,
    });
    return DeliveryDetailResponseDto.fromDetails(details);
  }
}
