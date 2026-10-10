import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  NOMINATIM_BASE_URL?: string;

  @IsString()
  @IsNotEmpty()
  NOMINATIM_USER_AGENT!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  AVERAGE_COURIER_SPEED_KMH?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  DEFAULT_SEARCH_RADIUS_KM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  MAX_SEARCH_RADIUS_KM?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  MAX_ACTIVE_DELIVERIES_PER_COURIER?: number;
}

/**
 * Validation stricte des variables d'environnement au démarrage (fail fast) :
 * un `.env` incomplet ou incohérent empêche l'application de démarrer.
 */
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Variables d'environnement invalides :\n${errors.toString()}`,
    );
  }

  return validatedConfig;
}
