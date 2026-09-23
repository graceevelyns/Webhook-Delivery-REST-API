import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { EventsService } from './events.service.js';
import { EventsRepository } from './events.repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { EventsController } from './events.controller.js';
import { DeliveriesModule } from '../deliveries/deliveries.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event]),
    AuthModule,
    ProjectsModule,
    DeliveriesModule,
  ],
  providers: [EventsService, EventsRepository],
  exports: [EventsService],
  controllers: [EventsController],
})
export class EventsModule {}
