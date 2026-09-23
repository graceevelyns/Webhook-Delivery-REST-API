import { Injectable } from '@nestjs/common';
import { Event } from '../events/entities/event.entity.js';
import { WebhookEndpointsRepository } from '../webhook-endpoints/webhook-endpoints.repository.js';
import { Delivery } from './entities/delivery.entity.js';
import { DeliveriesRepository } from './deliveries.repository.js';

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly deliveriesRepository: DeliveriesRepository,
    private readonly endpointsRepository: WebhookEndpointsRepository,
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

  findAllByEvent(eventId: string): Promise<Delivery[]> {
    return this.deliveriesRepository.findAllByEvent(eventId);
  }
}
