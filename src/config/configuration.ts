export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  rabbitMqUrl: string;
  jwtSecret: string;
  nominatimBaseUrl: string;
  nominatimUserAgent: string;
  averageCourierSpeedKmh: number;
  defaultSearchRadiusKm: number;
  maxSearchRadiusKm: number;
  maxActiveDeliveriesPerCourier: number;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3003', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  rabbitMqUrl: process.env.RABBITMQ_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  nominatimBaseUrl:
    process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org',
  nominatimUserAgent: process.env.NOMINATIM_USER_AGENT ?? '',
  averageCourierSpeedKmh: parseFloat(
    process.env.AVERAGE_COURIER_SPEED_KMH ?? '20',
  ),
  defaultSearchRadiusKm: parseFloat(
    process.env.DEFAULT_SEARCH_RADIUS_KM ?? '5',
  ),
  maxSearchRadiusKm: parseFloat(process.env.MAX_SEARCH_RADIUS_KM ?? '50'),
  maxActiveDeliveriesPerCourier: parseInt(
    process.env.MAX_ACTIVE_DELIVERIES_PER_COURIER ?? '3',
    10,
  ),
});
