import {
  Controller,
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto.js';
import { UpdateWebhookEndpointDto } from './dto/update-webhook-endpoint.dto.js';
import { WebhookEndpointsService } from './webhook-endpoints.service.js';

type AuthenticatedRequest = Request & {
  user: { id: string; email: string };
};

@UseGuards(JwtAuthGuard)
@Controller()
export class WebhookEndpointsController {
  constructor(private readonly endpointsService: WebhookEndpointsService) {}

  @Post('projects/:projectId/webhook-endpoints')
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateWebhookEndpointDto,
  ) {
    return this.endpointsService.create(projectId, request.user.id, dto);
  }

  @Get('projects/:projectId/webhook-endpoints')
  findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.endpointsService.findAll(projectId, request.user.id);
  }

  @Get('webhook-endpoints/:id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.endpointsService.findOne(id, request.user.id);
  }

  @Patch('webhook-endpoints/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateWebhookEndpointDto,
  ) {
    return this.endpointsService.update(id, request.user.id, dto);
  }

  @Delete('webhook-endpoints/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.endpointsService.remove(id, request.user.id);
  }
}
