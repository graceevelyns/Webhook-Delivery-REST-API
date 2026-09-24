import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery, DeliveryStatus } from './entities/delivery.entity.js';

type CreateDeliveryData = Pick<
  Delivery,
  'eventId' | 'webhookEndpointId' | 'targetUrl' | 'attemptNumber'
>;

@Injectable()
export class DeliveriesRepository {
  constructor(
    @InjectRepository(Delivery)
    private readonly repository: Repository<Delivery>,
  ) {}

  async createMany(data: CreateDeliveryData[]): Promise<Delivery[]> {
    if (data.length === 0) {
      return [];
    }

    const deliveries = this.repository.create(
      data.map((item) => ({
        ...item,
        status: DeliveryStatus.Pending,
      })),
    );

    return this.repository.save(deliveries);
  }

  findAllByEventAndProject(
    eventId: string,
    projectId: string,
  ): Promise<Delivery[]> {
    return this.repository.find({
      where: {
        eventId,
        event: {
          projectId,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  findOneByIdAndUser(id: string, userId: string): Promise<Delivery | null> {
    return this.repository.findOne({
      where: {
        id,
        event: {
          project: {
            userId,
          },
        },
      },
    });
  }

  async markProcessing(id: string): Promise<boolean> {
    const result = await this.repository.update(
      { id, status: DeliveryStatus.Pending },
      { status: DeliveryStatus.Processing, startedAt: () => 'CURRENT_TIMESTAMP' },
    );
    return (result.affected ?? 0) > 0;
  }

  async markSuccess(
    id: string,
    httpStatusCode: number,
    responseBody: string,
  ): Promise<void> {
    await this.repository.update(
      { id, status: DeliveryStatus.Processing },
      {
        status: DeliveryStatus.Success,
        httpStatusCode,
        responseBody,
        errorMessage: null,
        finishedAt: () => 'CURRENT_TIMESTAMP',
      },
    );
  }

  async markFailed(
    id: string,
    httpStatusCode: number | null,
    responseBody: string | null,
    errorMessage: string,
  ): Promise<void> {
    await this.repository.update(
      { id, status: DeliveryStatus.Processing },
      {
        status: DeliveryStatus.Failed,
        httpStatusCode,
        responseBody,
        errorMessage,
        finishedAt: () => 'CURRENT_TIMESTAMP',
      },
    );
  }
}
