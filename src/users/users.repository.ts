import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

type CreateUserData = Pick<User, 'email' | 'name' | 'passwordHash'>;

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
  }

  async create(data: CreateUserData): Promise<User> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }
}
