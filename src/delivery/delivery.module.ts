import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../shared/shared.module';
import { AddressModule } from '../address/address.module';
import { DELIVERY_REPOSITORY } from './domain/delivery-repository.port';
import { DELIVERY_EVENT_PUBLISHER } from './domain/delivery-event-publisher.port';
import {
  AVERAGE_COURIER_SPEED_KMH,
  DEFAULT_SEARCH_RADIUS_KM,
  MAX_ACTIVE_DELIVERIES_PER_COURIER,
  MAX_SEARCH_RADIUS_KM,
} from './application/config-tokens';
import { AcceptDeliveryUseCase } from './application/accept-delivery.use-case';
import { CreateDeliveryUseCase } from './application/create-delivery.use-case';
import { GetDeliveryUseCase } from './application/get-delivery.use-case';
import { HandleOrderReadyUseCase } from './application/handle-order-ready.use-case';
import { ListAvailableDeliveriesUseCase } from './application/list-available-deliveries.use-case';
import { ListCourierHistoryUseCase } from './application/list-courier-history.use-case';
import { UpdateCourierLocationUseCase } from './application/update-courier-location.use-case';
import { UpdateDeliveryStatusUseCase } from './application/update-delivery-status.use-case';
import { DeliveryOrmEntity } from './infrastructure/persistence/delivery.orm-entity';
import { TypeOrmDeliveryRepository } from './infrastructure/persistence/typeorm-delivery.repository';
import { RabbitMqDeliveryEventPublisher } from './infrastructure/messaging/rabbitmq-delivery-event-publisher';
import { OrderReadyConsumer } from './infrastructure/messaging/order-ready.consumer';
import { DeliveryController } from './presentation/delivery.controller';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    AddressModule,
    TypeOrmModule.forFeature([DeliveryOrmEntity]),
  ],
  controllers: [DeliveryController],
  providers: [
    CreateDeliveryUseCase,
    AcceptDeliveryUseCase,
    UpdateDeliveryStatusUseCase,
    UpdateCourierLocationUseCase,
    GetDeliveryUseCase,
    ListAvailableDeliveriesUseCase,
    ListCourierHistoryUseCase,
    HandleOrderReadyUseCase,
    OrderReadyConsumer,
    { provide: DELIVERY_REPOSITORY, useClass: TypeOrmDeliveryRepository },
    {
      provide: DELIVERY_EVENT_PUBLISHER,
      useClass: RabbitMqDeliveryEventPublisher,
    },
    {
      provide: MAX_ACTIVE_DELIVERIES_PER_COURIER,
      useFactory: (configService: ConfigService) =>
        configService.get<number>('maxActiveDeliveriesPerCourier'),
      inject: [ConfigService],
    },
    {
      provide: AVERAGE_COURIER_SPEED_KMH,
      useFactory: (configService: ConfigService) =>
        configService.get<number>('averageCourierSpeedKmh'),
      inject: [ConfigService],
    },
    {
      provide: DEFAULT_SEARCH_RADIUS_KM,
      useFactory: (configService: ConfigService) =>
        configService.get<number>('defaultSearchRadiusKm'),
      inject: [ConfigService],
    },
    {
      provide: MAX_SEARCH_RADIUS_KM,
      useFactory: (configService: ConfigService) =>
        configService.get<number>('maxSearchRadiusKm'),
      inject: [ConfigService],
    },
  ],
})
export class DeliveryModule {}
