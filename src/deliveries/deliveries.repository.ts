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
}
