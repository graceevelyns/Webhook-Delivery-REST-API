import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { Project } from '../src/projects/entities/project.entity.js';
import { User } from '../src/users/entities/user.entity.js';

describe('Projects (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const password = 'test-password-123';
  const ownerEmail = `project-owner-${randomUUID()}@example.com`;
  const otherEmail = `project-other-${randomUUID()}@example.com`;

  async function registerAndLogin(email: string): Promise<string> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Test User', email, password })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return login.body.access_token as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (dataSource) {
      const users = await dataSource.getRepository(User).find({
        where: [{ email: ownerEmail }, { email: otherEmail }],
      });
      const userIds = users.map((user) => user.id);

      if (userIds.length > 0) {
        await dataSource
          .getRepository(Project)
          .createQueryBuilder()
          .delete()
          .where('user_id IN (:...userIds)', { userIds })
          .execute();

        await dataSource.getRepository(User).delete(userIds);
      }
    }

    if (app) {
      await app.close();
    }
  });

  it('supports CRUD and prevents access to another user’s project', async () => {
    const ownerToken = await registerAndLogin(ownerEmail);
    const otherToken = await registerAndLogin(otherEmail);

    await request(app.getHttpServer()).get('/projects').expect(401);

    const created = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Project', description: 'Initial description' })
      .expect(201);

    const projectId = created.body.id as string;
    expect(created.body.name).toBe('E2E Project');

    const list = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(list.body.some((project: Project) => project.id === projectId)).toBe(
      true,
    );

    const detail = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(detail.body.id).toBe(projectId);

    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Changed by other user' })
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Updated Project', description: null })
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Updated Project');
        expect(body.description).toBeNull();
      });

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(400);

    await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: '' })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
