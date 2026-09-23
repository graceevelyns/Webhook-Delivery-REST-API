import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { Event } from '../src/events/entities/event.entity.js';
import { Project } from '../src/projects/entities/project.entity.js';
import { User } from '../src/users/entities/user.entity.js';

describe('Events (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const password = 'test-password-123';
  const ownerEmail = `event-owner-${randomUUID()}@example.com`;
  const otherEmail = `event-other-${randomUUID()}@example.com`;

  async function registerAndLogin(email: string): Promise<string> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Test User',
        email,
        password,
      })
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
        const projects = await dataSource.getRepository(Project).find({
          where: userIds.map((userId) => ({ userId })),
        });
        const projectIds = projects.map((project) => project.id);

        if (projectIds.length > 0) {
          await dataSource
            .getRepository(Event)
            .createQueryBuilder()
            .delete()
            .where('project_id IN (:...projectIds)', { projectIds })
            .execute();

          await dataSource.getRepository(Project).delete(projectIds);
        }

        await dataSource.getRepository(User).delete(userIds);
      }
    }

    if (app) {
      await app.close();
    }
  });

  it('creates and lists events while protecting project ownership', async () => {
    const ownerToken = await registerAndLogin(ownerEmail);
    const otherToken = await registerAndLogin(otherEmail);

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Event E2E Project' })
      .expect(201);

    const projectId = projectResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/events`)
      .send({
        type: 'order.created',
        payload: { orderId: 'order-123' },
      })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/events`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        type: 'order.created',
        payload: { orderId: 'order-123' },
      })
      .expect(404);

    const created = await request(app.getHttpServer())
      .post(`/projects/${projectId}/events`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'order.created',
        payload: {
          orderId: 'order-123',
          total: 150000,
        },
      })
      .expect(201);

    const eventId = created.body.id as string;

    expect(created.body.projectId).toBe(projectId);
    expect(created.body.type).toBe('order.created');
    expect(created.body.payload).toEqual({
      orderId: 'order-123',
      total: 150000,
    });

    const list = await request(app.getHttpServer())
      .get(`/projects/${projectId}/events`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(eventId);

    await request(app.getHttpServer())
      .get(`/projects/${projectId}/events`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/events`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: '   ',
        payload: { orderId: 'order-456' },
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/events`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'order.created',
        payload: 'invalid payload',
      })
      .expect(400);
  });
});
