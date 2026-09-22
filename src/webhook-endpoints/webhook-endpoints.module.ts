import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity.js';
import { WebhookEndpointsController } from './webhook-endpoints.controller.js';
import { WebhookEndpointsService } from './webhook-endpoints.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { WebhookEndpointsRepository } from './webhook-endpoints.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEndpoint]),
    AuthModule,
    ProjectsModule,
  ],
  controllers: [WebhookEndpointsController],
  providers: [WebhookEndpointsService, WebhookEndpointsRepository],
})
export class WebhookEndpointsModule {}
