import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsRepository } from '../projects/projects.repository.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { Event } from './entities/event.entity.js';
import { EventsRepository } from './events.repository.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreateEventDto,
  ): Promise<Event> {
    await this.ensureProjectOwner(projectId, userId);

    const type = dto.type.trim();
    if (!type) {
      throw new BadRequestException('Event type cannot be empty');
    }

    return this.eventsRepository.create({
      projectId,
      type,
      payload: dto.payload,
    });
  }

  async findAll(projectId: string, userId: string): Promise<Event[]> {
    await this.ensureProjectOwner(projectId, userId);
    return this.eventsRepository.findAllByProject(projectId);
  }

  private async ensureProjectOwner(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.projectsRepository.findOneByIdAndUser(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}
