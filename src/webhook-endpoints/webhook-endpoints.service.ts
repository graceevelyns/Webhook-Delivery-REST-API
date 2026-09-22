import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsRepository } from '../projects/projects.repository.js';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto.js';
import { UpdateWebhookEndpointDto } from './dto/update-webhook-endpoint.dto.js';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity.js';
import { WebhookEndpointsRepository } from './webhook-endpoints.repository.js';

@Injectable()
export class WebhookEndpointsService {
  constructor(
    private readonly endpointsRepository: WebhookEndpointsRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreateWebhookEndpointDto,
  ): Promise<WebhookEndpoint> {
    const project = await this.projectsRepository.findOneByIdAndUser(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Endpoint name cannot be empty');
    }

    return this.endpointsRepository.create({
      projectId,
      name,
      url: dto.url,
    });
  }

  async findAll(projectId: string, userId: string): Promise<WebhookEndpoint[]> {
    const project = await this.projectsRepository.findOneByIdAndUser(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.endpointsRepository.findAllByProject(projectId);
  }

  async findOne(id: string, userId: string): Promise<WebhookEndpoint> {
    const endpoint = await this.endpointsRepository.findOneByIdAndUser(
      id,
      userId,
    );

    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    return endpoint;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateWebhookEndpointDto,
  ): Promise<WebhookEndpoint> {
    if (dto.name === undefined && dto.url === undefined && dto.isActive === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const endpoint = await this.findOne(id, userId);

    const changes: Partial<Pick<WebhookEndpoint, 'name' | 'url' | 'isActive'>> =
      {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Endpoint name cannot be empty');
      }
      changes.name = name;
    }

    if (dto.url !== undefined) {
      changes.url = dto.url;
    }

    if (dto.isActive !== undefined) {
      changes.isActive = dto.isActive;
    }

    const updated = await this.endpointsRepository.updateByIdAndProject(
      id,
      endpoint.projectId,
      changes,
    );

    if (!updated) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const endpoint = await this.findOne(id, userId);

    const deleted = await this.endpointsRepository.softDeleteByIdAndProject(
      id,
      endpoint.projectId,
    );

    if (!deleted) {
      throw new NotFoundException('Webhook endpoint not found');
    }
  }
}
