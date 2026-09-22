import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity.js';

type CreateProjectData = Pick<Project, 'userId' | 'name' | 'description'>;

type UpdateProjectData = Partial<Pick<Project, 'name' | 'description'>>;

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(Project)
    private readonly repository: Repository<Project>,
  ) {}

  async create(data: CreateProjectData): Promise<Project> {
    const project = this.repository.create(data);
    return this.repository.save(project);
  }

  findAllByUser(userId: string): Promise<Project[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  findOneByIdAndUser(id: string, userId: string): Promise<Project | null> {
    return this.repository.findOne({
      where: { id, userId },
    });
  }

  async updateByIdAndUser(
    id: string,
    userId: string,
    data: UpdateProjectData,
  ): Promise<boolean> {
    const result = await this.repository.update({ id, userId }, data);
    return (result.affected ?? 0) > 0;
  }

  async deleteByIdAndUser(id: string, userId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
