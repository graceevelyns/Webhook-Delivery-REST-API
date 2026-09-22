import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity.js';

type CreateEventData = Pick<Event, 'projectId' | 'type' | 'payload'>;

@Injectable()
export class EventsRepository {
  constructor(
    @InjectRepository(Event)
    private readonly repository: Repository<Event>,
  ) {}

  async create(data: CreateEventData): Promise<Event> {
    const event = this.repository.create(data);
    return this.repository.save(event);
  }

  findAllByProject(projectId: string): Promise<Event[]> {
    return this.repository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }
}
