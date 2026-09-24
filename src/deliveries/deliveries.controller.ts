import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DeliveriesService } from './deliveries.service.js';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller()
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('projects/:projectId/events/:eventId/deliveries')
  findAllByEvent(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.deliveriesService.findAllByEvent(
      projectId,
      eventId,
      request.user.id,
    );
  }

  @Get('deliveries/:id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.deliveriesService.findOne(id, request.user.id);
  }
}
