import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from './entities/delivery.entity.js';
import { WebhookEndpointsModule } from '../webhook-endpoints/webhook-endpoints.module.js';
import { DeliveriesService } from './deliveries.service.js';
import { DeliveriesRepository } from './deliveries.repository.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DeliveriesController } from './deliveries.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Delivery]),
    WebhookEndpointsModule,
    ProjectsModule,
    AuthModule,
  ],
  providers: [DeliveriesService, DeliveriesRepository],
  exports: [DeliveriesService],
  controllers: [DeliveriesController],
})
export class DeliveriesModule {}
