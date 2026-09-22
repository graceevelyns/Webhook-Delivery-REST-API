import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { User } from '../src/users/entities/user.entity.js';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const email = `auth-test-${randomUUID()}@example.com`;
  const password = 'test-password-123';

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
      await dataSource.getRepository(User).delete({ email });
    }

    if (app) {
      await app.close();
    }
  });

  it('registers, logs in, and accesses a protected route', async () => {
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Test User',
        email,
        password,
      })
      .expect(201);

    expect(registration.body.email).toBe(email);
    expect(registration.body.passwordHash).toBeUndefined();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Test User',
        email,
        password,
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password: 'wrong-password',
      })
      .expect(401);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const accessToken = login.body.access_token as string;
    expect(typeof accessToken).toBe('string');

    await request(app.getHttpServer()).get('/projects').expect(401);

    await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('rejects invalid registration input', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: '',
        email: 'not-an-email',
        password: 'short',
      })
      .expect(400);
  });
});
