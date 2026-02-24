import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

/**
 * E2E tests for auth endpoints: /auth/register, /auth/login, /auth/me, /auth/refresh.
 * Tests that require DB need a valid DATABASE_URL in the environment.
 * JWT secrets are injected via test/setup-env.ts.
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
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

  // Shared user for login/refresh/me tests
  let sharedEmail: string;
  let sharedPassword: string;
  let sharedAccessToken: string;
  let sharedRefreshToken: string;

  beforeAll(async () => {
    sharedEmail = `e2e-login-${Date.now()}@example.com`;
    sharedPassword = 'Password123';
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: sharedEmail, password: sharedPassword });
    if (res.status !== 201) {
      throw new Error(`Test setup failed: could not register shared user (${res.status}: ${JSON.stringify(res.body)})`);
    }
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

  describe('POST /auth/login', () => {
    it('should return 200 with accessToken, refreshToken and user without password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: sharedEmail, password: sharedPassword })
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(sharedEmail);
      expect(res.body.user.role).toBe('USER');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('createdAt');
      expect(res.body.user).not.toHaveProperty('password');

      sharedAccessToken = res.body.accessToken;
      sharedRefreshToken = res.body.refreshToken;
    });

    it('should return 401 with generic message when email is unknown', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'unknown@example.com', password: 'Password123' })
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((res) => {
          expect(res.body.message).toBe('Identifiants invalides');
        });
    });

    it('should return 401 with generic message when password is wrong', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: sharedEmail, password: 'WrongPassword123' })
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((res) => {
          expect(res.body.message).toBe('Identifiants invalides');
        });
    });

    it('should return 400 when body is invalid', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'Password123' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /auth/me', () => {
    it('should return 200 with public profile when accessToken is valid', async () => {
      // Ensure we have a token
      if (!sharedAccessToken) {
        const loginRes = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: sharedEmail, password: sharedPassword });
        sharedAccessToken = loginRes.body.accessToken;
      }

      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe(sharedEmail);
          expect(res.body.role).toBe('USER');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 401 when no token is provided', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when token is invalid', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 200 with a new accessToken when refreshToken is valid', async () => {
      if (!sharedRefreshToken) {
        const loginRes = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: sharedEmail, password: sharedPassword });
        sharedRefreshToken = loginRes.body.refreshToken;
      }

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: sharedRefreshToken })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
        });
    });

    it('should return 401 when refreshToken is invalid', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'forged.or.invalid.token' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 when refreshToken is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /auth/admin-test', () => {
    let userAccessToken: string;
    let adminAccessToken: string;
    let superAdminAccessToken: string;

    beforeAll(async () => {
      const ts = Date.now();
      const userEmail = `e2e-user-${ts}@example.com`;
      const adminEmail = `e2e-admin-${ts}@example.com`;
      const superAdminEmail = `e2e-superadmin-${ts}@example.com`;
      const password = 'Password123';

      // Register all three users (all start as USER)
      for (const email of [userEmail, adminEmail, superAdminEmail]) {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email, password });
        if (res.status !== 201) {
          throw new Error(`Test setup failed registering ${email}: ${res.status}`);
        }
      }

      // Elevate roles in DB
      await prisma.user.update({ where: { email: adminEmail }, data: { role: UserRole.ADMIN } });
      await prisma.user.update({ where: { email: superAdminEmail }, data: { role: UserRole.SUPER_ADMIN } });

      // Login all three to get tokens
      const loginUser = await request(app.getHttpServer()).post('/auth/login').send({ email: userEmail, password });
      const loginAdmin = await request(app.getHttpServer()).post('/auth/login').send({ email: adminEmail, password });
      const loginSuperAdmin = await request(app.getHttpServer()).post('/auth/login').send({ email: superAdminEmail, password });

      if (loginUser.status !== 200 || loginAdmin.status !== 200 || loginSuperAdmin.status !== 200) {
        throw new Error('Test setup failed: could not login test users');
      }

      userAccessToken = loginUser.body.accessToken;
      adminAccessToken = loginAdmin.body.accessToken;
      superAdminAccessToken = loginSuperAdmin.body.accessToken;
    });

    it('should return 401 when no token is provided', () => {
      return request(app.getHttpServer())
        .get('/auth/admin-test')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 403 when user has role USER', () => {
      return request(app.getHttpServer())
        .get('/auth/admin-test')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 200 when user has role ADMIN', () => {
      return request(app.getHttpServer())
        .get('/auth/admin-test')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.message).toBe('ok');
          expect(res.body.role).toBe('ADMIN');
        });
    });

    it('should return 200 when user has role SUPER_ADMIN', () => {
      return request(app.getHttpServer())
        .get('/auth/admin-test')
        .set('Authorization', `Bearer ${superAdminAccessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.message).toBe('ok');
          expect(res.body.role).toBe('SUPER_ADMIN');
        });
    });
  });
});
