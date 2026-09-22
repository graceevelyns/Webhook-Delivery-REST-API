import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { User } from '../src/users/entities/user.entity.js';
import { Project } from '../src/projects/entities/project.entity.js';
import { WebhookEndpoint } from '../src/webhook-endpoints/entities/webhook-endpoint.entity.js';

describe('Webhook endpoints (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const password = 'test-password-123';
  const firstEmail = `endpoint-owner-${randomUUID()}@example.com`;
  const secondEmail = `endpoint-other-${randomUUID()}@example.com`;

  async function registerAndLogin(email: string): Promise<string> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Test User', email, password })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body.access_token as string;
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
        where: [{ email: firstEmail }, { email: secondEmail }],
      });
      const userIds = users.map((user) => user.id);

      if (userIds.length > 0) {
        const projects = await dataSource.getRepository(Project).find({
          where: userIds.map((userId) => ({ userId })),
        });
        const projectIds = projects.map((project) => project.id);

        if (projectIds.length > 0) {
          await dataSource
            .getRepository(WebhookEndpoint)
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

  it('creates, lists, updates, protects, and deletes an endpoint', async () => {
    const ownerToken = await registerAndLogin(firstEmail);
    const otherToken = await registerAndLogin(secondEmail);

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Project' })
      .expect(201);

    const projectId = projectResponse.body.id as string;

    const created = await request(app.getHttpServer())
      .post(`/projects/${projectId}/webhook-endpoints`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'E2E Endpoint',
        url: 'https://example.com/webhook',
      })
      .expect(201);

    const endpointId = created.body.id as string;
    expect(created.body.projectId).toBe(projectId);
    expect(created.body.isActive).toBe(true);

    const list = await request(app.getHttpServer())
      .get(`/projects/${projectId}/webhook-endpoints`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(endpointId);

    await request(app.getHttpServer())
      .get(`/webhook-endpoints/${endpointId}`)
      .expect(401);

    await request(app.getHttpServer())
      .get(`/webhook-endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    const updated = await request(app.getHttpServer())
      .patch(`/webhook-endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false })
      .expect(200);

    expect(updated.body.isActive).toBe(false);

    await request(app.getHttpServer())
      .delete(`/webhook-endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/webhook-endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);

    const listAfterDelete = await request(app.getHttpServer())
      .get(`/projects/${projectId}/webhook-endpoints`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(listAfterDelete.body).toEqual([]);
  });
});
