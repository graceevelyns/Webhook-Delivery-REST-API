import { Injectable, NotFoundException } from '@nestjs/common';
import { Event } from '../events/entities/event.entity.js';
import { WebhookEndpointsRepository } from '../webhook-endpoints/webhook-endpoints.repository.js';
import { Delivery } from './entities/delivery.entity.js';
import { DeliveriesRepository } from './deliveries.repository.js';
import { ProjectsRepository } from '../projects/projects.repository.js';

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly deliveriesRepository: DeliveriesRepository,
    private readonly endpointsRepository: WebhookEndpointsRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async createPendingForEvent(event: Event): Promise<Delivery[]> {
    const endpoints = await this.endpointsRepository.findActiveByProject(
      event.projectId,
    );

    return this.deliveriesRepository.createMany(
      endpoints.map((endpoint) => ({
        eventId: event.id,
        webhookEndpointId: endpoint.id,
        targetUrl: endpoint.url,
        attemptNumber: 1,
      })),
    );
  }

  async findAllByEvent(
    projectId: string,
    eventId: string,
    userId: string,
  ): Promise<Delivery[]> {
    const project = await this.projectsRepository.findOneByIdAndUser(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.deliveriesRepository.findAllByEventAndProject(
      eventId,
      projectId,
    );
  }

  async findOne(id: string, userId: string): Promise<Delivery> {
    const delivery = await this.deliveriesRepository.findOneByIdAndUser(
      id,
      userId,
    );

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    return delivery;
  }
}
