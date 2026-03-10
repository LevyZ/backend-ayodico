import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { TranslationDirection, UserRole } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

jest.setTimeout(30000);

const ADMIN_EMAIL = 'admin-moderation-e2e@test.com';
const ADMIN_PASSWORD = 'Pass123!';
const SUPER_ADMIN_EMAIL = 'superadmin-moderation-e2e@test.com';
const SUPER_ADMIN_PASSWORD = 'Pass123!';
const USER_EMAIL = 'user-moderation-e2e@test.com';
const USER_PASSWORD = 'Pass123!';

describe('TranslationsController (GET /translations/pending) — Moderation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminAccessToken: string;
  let superAdminAccessToken: string;
  let userAccessToken: string;

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
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Register ADMIN user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(HttpStatus.CREATED);

    // Promote to ADMIN via Prisma
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: UserRole.ADMIN },
    });

    // Re-login to get token with ADMIN role in JWT
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(HttpStatus.OK);
    adminAccessToken = (adminLogin.body as { accessToken: string }).accessToken;

    // Register SUPER_ADMIN user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD })
      .expect(HttpStatus.CREATED);

    // Promote to SUPER_ADMIN via Prisma
    await prisma.user.update({
      where: { email: SUPER_ADMIN_EMAIL },
      data: { role: UserRole.SUPER_ADMIN },
    });

    // Re-login to get token with SUPER_ADMIN role in JWT
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD })
      .expect(HttpStatus.OK);
    superAdminAccessToken = (superAdminLogin.body as { accessToken: string }).accessToken;

    // Register regular USER
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(HttpStatus.CREATED);

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(HttpStatus.OK);
    userAccessToken = (userLogin.body as { accessToken: string }).accessToken;

    // Seed a PENDING contribution via the API (as regular user)
    await request(app.getHttpServer())
      .post('/translations')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({
        frenchTerm: 'bonjour-e2e',
        bheteTerm: 'kpata-e2e',
        toneNotation: '1-2',
        direction: TranslationDirection.FR_TO_BHETE,
        contextOrMeaning: 'Test e2e moderation',
      })
      .expect(HttpStatus.CREATED);
  });

  afterAll(async () => {
    const adminUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    const superAdminUser = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
    const regularUser = await prisma.user.findUnique({ where: { email: USER_EMAIL } });

    if (adminUser) {
      await prisma.translation.deleteMany({ where: { contributorId: adminUser.id } });
      await prisma.user.delete({ where: { id: adminUser.id } });
    }
    if (superAdminUser) {
      await prisma.translation.deleteMany({ where: { contributorId: superAdminUser.id } });
      await prisma.user.delete({ where: { id: superAdminUser.id } });
    }
    if (regularUser) {
      await prisma.translation.deleteMany({ where: { contributorId: regularUser.id } });
      await prisma.user.delete({ where: { id: regularUser.id } });
    }
    await app.close();
  });

  describe('GET /translations/pending', () => {
    it('returns 200 with array for ADMIN user and validates response shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/translations/pending')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThan(0);

      const item = (res.body as Record<string, unknown>[])[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('frenchTerm');
      expect(item).toHaveProperty('bheteTerm');
      expect(item).toHaveProperty('toneNotation');
      expect(item).toHaveProperty('direction');
      expect(item).toHaveProperty('contextOrMeaning');
      expect(item).toHaveProperty('regionId');
      expect(item).toHaveProperty('cantonId');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('contributor');
      expect(item).toHaveProperty('region');
      expect(item).toHaveProperty('canton');
    });

    it('returns 200 with array for SUPER_ADMIN user', async () => {
      const res = await request(app.getHttpServer())
        .get('/translations/pending')
        .set('Authorization', `Bearer ${superAdminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .get('/translations/pending')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('returns 403 for regular USER', async () => {
      await request(app.getHttpServer())
        .get('/translations/pending')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
