import {
  DataSource,
  DataSourceOptions,
  NamingStrategyInterface,
} from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { config } from 'dotenv';

config();

const SnakeNamingStrategyTyped = SnakeNamingStrategy as {
  new (): NamingStrategyInterface;
};

const snakeNamingStrategy = new SnakeNamingStrategyTyped();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: ['dist/**/*.entity.{ts,js}'],
  synchronize: false,
  migrations: ['dist/migrations/*.{ts,js}'],
  extra: {
    ssl: false,
  },
  namingStrategy: snakeNamingStrategy,
  logging: false,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
