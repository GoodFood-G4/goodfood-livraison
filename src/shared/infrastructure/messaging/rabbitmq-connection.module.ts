import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import type {
  AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';
import {
  RABBITMQ_CHANNEL_WRAPPER,
  RABBITMQ_CONNECTION,
} from './rabbitmq.tokens';

const PREFETCH_COUNT = 10;

/**
 * Se connecte au RabbitMQ déclaré dans goodfood-infra. Ce service ne déclare
 * ni exchange ni queue : la topologie (exchange `goodfood.events`, queue
 * `livraison.queue`) appartient à goodfood-infra.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: (configService: ConfigService): AmqpConnectionManager => {
        return amqp.connect([configService.get<string>('rabbitMqUrl', '')]);
      },
      inject: [ConfigService],
    },
    {
      provide: RABBITMQ_CHANNEL_WRAPPER,
      useFactory: (connection: AmqpConnectionManager): ChannelWrapper => {
        return connection.createChannel({
          setup: (channel: ConfirmChannel) => channel.prefetch(PREFETCH_COUNT),
        });
      },
      inject: [RABBITMQ_CONNECTION],
    },
  ],
  exports: [RABBITMQ_CONNECTION, RABBITMQ_CHANNEL_WRAPPER],
})
export class RabbitMqConnectionModule {}
