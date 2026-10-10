import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * DataSource utilisé uniquement par la CLI TypeORM (migrations), en dehors du
 * contexte Nest. L'application elle-même se configure via TypeOrmModule.forRootAsync.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.orm-entity{.ts,.js}'],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  synchronize: false,
});
