import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TranslationDirection } from '@prisma/client';

jest.setTimeout(30000);

const TEST_EMAIL = 'contrib-e2e@test.com';
const TEST_PASSWORD = 'Pass123!';

/**
 * E2E tests for POST /translations (contribution endpoint).
 * Requires a test user — created in beforeAll, cleaned up in afterAll.
 */
describe('TranslationsController (POST /translations) — Contributions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

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

    // Create test user
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(registerRes.status).toBe(HttpStatus.CREATED);

    // Login to get access token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(HttpStatus.OK);
    accessToken = (loginRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (user) {
      await prisma.translation.deleteMany({ where: { contributorId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await app.close();
  });

  const validBody = {
    frenchTerm: 'soleil',
    bheteTerm: 'kpata',
    toneNotation: 'high-low',
    direction: TranslationDirection.FR_TO_BHETE,
  };

  describe('POST /translations', () => {
    it('creates a contribution (201) when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .post('/translations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validBody)
        .expect(HttpStatus.CREATED);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('id');
      expect(body.frenchTerm).toBe('soleil');
      expect(body.bheteTerm).toBe('kpata');
      expect(body.toneNotation).toBe('high-low');
      expect(body.direction).toBe(TranslationDirection.FR_TO_BHETE);
      expect(body.status).toBe('PENDING');
      expect(body).toHaveProperty('createdAt');
      expect(body.regionId).toBeNull();
      expect(body.cantonId).toBeNull();
    });

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .post('/translations')
        .send(validBody)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('returns 400 when body is invalid (missing required fields)', async () => {
      await request(app.getHttpServer())
        .post('/translations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ frenchTerm: 'soleil' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 404 when regionId does not exist', async () => {
      await request(app.getHttpServer())
        .post('/translations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validBody, regionId: '00000000-0000-0000-0000-000000000000' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 404 when cantonId does not exist', async () => {
      const region = await prisma.region.findFirst();
      expect(region).not.toBeNull(); // fail explicitly if no regions seeded
      await request(app.getHttpServer())
        .post('/translations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validBody, regionId: region!.id, cantonId: '00000000-0000-0000-0000-000000000000' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /translations/mine', () => {
    it('returns 200 with array of user contributions (authenticated)', async () => {
      const res = await request(app.getHttpServer())
        .get('/translations/mine')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      const body = res.body as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const first = body[0] as Record<string, unknown>;
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('frenchTerm');
      expect(first).toHaveProperty('bheteTerm');
      expect(first).toHaveProperty('toneNotation');
      expect(first).toHaveProperty('direction');
      expect(first).toHaveProperty('status');
      expect(first).toHaveProperty('regionId');
      expect(first).toHaveProperty('cantonId');
      expect(first).toHaveProperty('createdAt');
    });

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .get('/translations/mine')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /translations/:id', () => {
    let createdId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/translations/mine')
        .set('Authorization', `Bearer ${accessToken}`);
      const body = res.body as Array<{ id: string; status: string }>;
      const contrib = body[0];
      if (contrib) createdId = contrib.id;
    });

    it('returns 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .patch('/translations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ frenchTerm: 'test' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .patch(`/translations/${createdId ?? '00000000-0000-0000-0000-000000000000'}`)
        .send({ frenchTerm: 'test' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
