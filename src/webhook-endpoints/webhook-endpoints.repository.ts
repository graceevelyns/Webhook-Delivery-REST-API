import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity.js';

type CreateEndpointData = Pick<WebhookEndpoint, 'projectId' | 'name' | 'url'>;

type UpdateEndpointData = Partial<
  Pick<WebhookEndpoint, 'name' | 'url' | 'isActive'>
>;

@Injectable()
export class WebhookEndpointsRepository {
  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly repository: Repository<WebhookEndpoint>,
  ) {}

  async create(data: CreateEndpointData): Promise<WebhookEndpoint> {
    const endpoint = this.repository.create(data);
    return this.repository.save(endpoint);
  }

  findAllByProject(projectId: string): Promise<WebhookEndpoint[]> {
    return this.repository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  findOneByIdAndUser(
    id: string,
    userId: string,
  ): Promise<WebhookEndpoint | null> {
    return this.repository.findOne({
      where: {
        id,
        project: { userId },
      },
    });
  }

  async updateByIdAndProject(
    id: string,
    projectId: string,
    data: UpdateEndpointData,
  ): Promise<boolean> {
    const result = await this.repository.update({ id, projectId }, data);
    return (result.affected ?? 0) > 0;
  }

  async softDeleteByIdAndProject(
    id: string,
    projectId: string,
  ): Promise<boolean> {
    const result = await this.repository.softDelete({
      id,
      projectId,
    });
    return (result.affected ?? 0) > 0;
  }

  findActiveByProject(projectId: string): Promise<WebhookEndpoint[]> {
    return this.repository.find({
      where: { projectId, isActive: true },
    });
  }
}
