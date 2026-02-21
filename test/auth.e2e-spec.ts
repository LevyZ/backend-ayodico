import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E tests for POST /auth/register.
 * Tests that require DB (201, 409) need a valid DATABASE_URL in the environment.
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    const validBody = {
      email: `e2e-${Date.now()}@example.com`,
      password: 'Password123',
    };

    it('should return 201 and user without password when body is valid', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(validBody)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe(validBody.email);
          expect(res.body.role).toBe('USER');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 409 when email is already used', async () => {
      const body = { email: `dup-${Date.now()}@example.com`, password: 'Password123' };
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(body)
        .expect(HttpStatus.CREATED);
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(body)
        .expect(HttpStatus.CONFLICT)
        .expect((res) => {
          expect(res.body.message).toContain('déjà utilisé');
        });
    });

    it('should return 400 when email is invalid', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'Password123' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when password is too short', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'a@b.com', password: 'short' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when password has no letter or no digit', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'a@b.com', password: '12345678' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
