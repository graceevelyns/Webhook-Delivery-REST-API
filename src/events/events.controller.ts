import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { EventsService } from './events.service.js';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(
    @Param('projectId', ParseUUIDPipe)
    projectId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(projectId, request.user.id, dto);
  }

  @Get()
  findAll(
    @Param('projectId', ParseUUIDPipe)
    projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.eventsService.findAll(projectId, request.user.id);
  }
}
