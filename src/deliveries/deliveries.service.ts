import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Event } from '../events/entities/event.entity.js';
import { WebhookEndpointsRepository } from '../webhook-endpoints/webhook-endpoints.repository.js';
import { Delivery, DeliveryStatus } from './entities/delivery.entity.js';
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

  async dispatch(delivery: Delivery, event: Event): Promise<void> {
    const claimed = await this.deliveriesRepository.markProcessing(delivery.id);

    if (!claimed) {
      return;
    }

    try {
      const response = await fetch(delivery.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'webhook-delivery-api/1.0',
        },
        body: JSON.stringify({
          id: event.id,
          type: event.type,
          payload: event.payload,
          createdAt: event.createdAt,
        }),
        signal: AbortSignal.timeout(5_000), // 5 seconds timeout
      });

      const responseBody = (await response.text()).slice(0, 10_000); // limit to first 10,000 characters

      if (response.ok) {
        await this.deliveriesRepository.markSuccess(
          delivery.id,
          response.status,
          responseBody,
        );
        return;
      }

      await this.deliveriesRepository.markFailed(
        delivery.id,
        response.status,
        responseBody,
        `Webhook returned HTTP ${response.status}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown delivery error';
      await this.deliveriesRepository.markFailed(
        delivery.id,
        null,
        null,
        `Delivery failed: ${errorMessage}`,
      );
    }
  }

  async createAndDispatchForEvent(event: Event): Promise<Delivery[]> {
    const deliveries = await this.createPendingForEvent(event);

    await Promise.all(
      deliveries.map((delivery) => this.dispatch(delivery, event)),
    );

    return deliveries;
  }

  async retry(id: string, userId: string): Promise<Delivery> {
    const original =
      await this.deliveriesRepository.findOneWithEventByIdAndUser(id, userId);

    if (!original) {
      throw new NotFoundException('Delivery not found');
    }

    if (original.status !== DeliveryStatus.Failed) {
      throw new ConflictException('Only failed deliveries can be retried');
    }

    const latestAttempt = await this.deliveriesRepository.findLatestAttempt(
      original.eventId,
      original.webhookEndpointId,
    );

    if (!latestAttempt || latestAttempt.id !== original.id) {
      throw new ConflictException(
        'Only the latest delivery attempt can be retried',
      );
    }

    const retryDelivery = await this.deliveriesRepository.create({
      eventId: original.eventId,
      webhookEndpointId: original.webhookEndpointId,
      targetUrl: original.targetUrl,
      attemptNumber: original.attemptNumber + 1,
    });

    await this.dispatch(retryDelivery, original.event);

    return this.findOne(retryDelivery.id, userId);
  }
}
