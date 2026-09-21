import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookEndpoint])],
})
export class WebhookEndpointsModule {}
