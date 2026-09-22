import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { Project } from './entities/project.entity.js';
import { ProjectsRepository } from './projects.repository.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException('Project name cannot be empty');
    }

    return this.projectsRepository.create({
      userId,
      name,
      description: dto.description ?? null,
    });
  }

  findAll(userId: string): Promise<Project[]> {
    return this.projectsRepository.findAllByUser(userId);
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository.findOneByIdAndUser(
      id,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    if (dto.name === undefined && dto.description === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const name = dto.name?.trim();
    if (name !== undefined && !name) {
      throw new BadRequestException('Project name cannot be empty');
    }

    const updated = await this.projectsRepository.updateByIdAndUser(
      id,
      userId,
      {
        ...(name !== undefined && { name }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
      },
    );

    if (!updated) {
      throw new NotFoundException('Project not found');
    }

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const deleted = await this.projectsRepository.deleteByIdAndUser(id, userId);

    if (!deleted) {
      throw new NotFoundException('Project not found');
    }
  }
}
