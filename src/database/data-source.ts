import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment.validation.js';
import { User } from '../users/entities/user.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { WebhookEndpoint } from '../webhook-endpoints/entities/webhook-endpoint.entity.js';
import { Event } from '../events/entities/event.entity.js';
import { Delivery } from '../deliveries/entities/delivery.entity.js';

const environment = validateEnvironment(process.env);

export default new DataSource({
  type: 'postgres',
  host: environment.DB_HOST,
  port: environment.DB_PORT,
  username: environment.DB_USERNAME,
  password: environment.DB_PASSWORD,
  database: environment.DB_NAME,
  entities: [User, Project, WebhookEndpoint, Event, Delivery],
  migrations: [join(import.meta.dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
  migrationsRun: false,
  migrationsTransactionMode: 'all',
  synchronize: false,
});
