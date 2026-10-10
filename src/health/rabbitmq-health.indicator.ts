import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import type { AmqpConnectionManager } from 'amqp-connection-manager';
import { RABBITMQ_CONNECTION } from '../shared/infrastructure/messaging/rabbitmq.tokens';

@Injectable()
export class RabbitMqHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(RABBITMQ_CONNECTION)
    private readonly connection: AmqpConnectionManager,
  ) {
    super();
  }

  isHealthy(key: string): HealthIndicatorResult {
    const isConnected = this.connection.isConnected();
    const result = this.getStatus(key, isConnected);

    if (!isConnected) {
      throw new HealthCheckError('RabbitMQ non connecté', result);
    }

    return result;
  }
}
