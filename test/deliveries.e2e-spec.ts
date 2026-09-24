import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { afterEach, vi } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import {
  Delivery,
  DeliveryStatus,
} from '../src/deliveries/entities/delivery.entity.js';
import { Event } from '../src/events/entities/event.entity.js';
import { Project } from '../src/projects/entities/project.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { WebhookEndpoint } from '../src/webhook-endpoints/entities/webhook-endpoint.entity.js';

describe('Deliveries (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const password = 'test-password-123';
  const ownerEmail = `delivery-owner-${randomUUID()}@example.com`;
  const otherEmail = `delivery-other-${randomUUID()}@example.com`;

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

  afterEach(() => {
    vi.restoreAllMocks();
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
            .getRepository(Delivery)
            .createQueryBuilder()
            .delete()
            .where(
              'event_id IN (SELECT id FROM events WHERE project_id IN (:...projectIds))',
              { projectIds },
            )
            .execute();

          await dataSource
            .getRepository(Event)
            .createQueryBuilder()
            .delete()
            .where('project_id IN (:...projectIds)', { projectIds })
            .execute();

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

  it('retries the latest failed delivery and protects ownership', async () => {
    const ownerToken = await registerAndLogin(ownerEmail);
    const otherToken = await registerAndLogin(otherEmail);

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Delivery E2E Project' })
      .expect(201);

    const projectId = projectResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/webhook-endpoints`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Delivery E2E Endpoint',
        url: 'https://example.com/webhook',
      })
      .expect(201);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('temporary failure', { status: 500 }))
      .mockResolvedValueOnce(new Response('accepted', { status: 200 }));

    const eventResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/events`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'order.created',
        payload: { orderId: 'order-retry-123' },
      })
      .expect(201);

    const eventId = eventResponse.body.id as string;

    const initialList = await request(app.getHttpServer())
      .get(`/projects/${projectId}/events/${eventId}/deliveries`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(initialList.body).toHaveLength(1);

    const failedDelivery = initialList.body[0] as Delivery;
    expect(failedDelivery.attemptNumber).toBe(1);
    expect(failedDelivery.status).toBe(DeliveryStatus.Failed);
    expect(failedDelivery.httpStatusCode).toBe(500);

    await request(app.getHttpServer())
      .post(`/deliveries/${failedDelivery.id}/retry`)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/deliveries/${failedDelivery.id}/retry`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    const retryResponse = await request(app.getHttpServer())
      .post(`/deliveries/${failedDelivery.id}/retry`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    const retriedDeliveryId = retryResponse.body.id as string;
    expect(retryResponse.body.attemptNumber).toBe(2);
    expect(retryResponse.body.status).toBe(DeliveryStatus.Success);
    expect(retryResponse.body.httpStatusCode).toBe(200);
    expect(retryResponse.body.responseBody).toBe('accepted');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await request(app.getHttpServer())
      .post(`/deliveries/${failedDelivery.id}/retry`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(409);

    await request(app.getHttpServer())
      .post(`/deliveries/${retriedDeliveryId}/retry`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(409);

    const finalList = await request(app.getHttpServer())
      .get(`/projects/${projectId}/events/${eventId}/deliveries`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(finalList.body).toHaveLength(2);
    expect(
      finalList.body.some(
        (delivery: Delivery) =>
          delivery.id === retriedDeliveryId &&
          delivery.attemptNumber === 2 &&
          delivery.status === DeliveryStatus.Success,
      ),
    ).toBe(true);
  });
});
