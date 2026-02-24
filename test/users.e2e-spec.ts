import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E tests for user profile endpoints: GET /users/me, PATCH /users/me.
 * JWT secrets are injected via test/setup-env.ts.
 * Regions and cantons are created directly in beforeAll and cleaned up in afterAll.
 */
describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test data IDs created in beforeAll
  let region1Id: string;
  let canton1Id: string; // belongs to region1
  let region2Id: string;
  let canton2Id: string; // belongs to region2
  let accessToken: string;

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

    // Create test regions and cantons
    const ts = Date.now();
    const region1 = await prisma.region.create({
      data: { name: `TestRegion1-${ts}`, code: `TR1-${ts}` },
    });
    region1Id = region1.id;

    const canton1 = await prisma.canton.create({
      data: { name: `TestCanton1-${ts}`, code: `TC1-${ts}`, regionId: region1Id },
    });
    canton1Id = canton1.id;

    const region2 = await prisma.region.create({
      data: { name: `TestRegion2-${ts}`, code: `TR2-${ts}` },
    });
    region2Id = region2.id;

    const canton2 = await prisma.canton.create({
      data: { name: `TestCanton2-${ts}`, code: `TC2-${ts}`, regionId: region2Id },
    });
    canton2Id = canton2.id;

    // Register and login a shared user
    const email = `e2e-users-${ts}@example.com`;
    const password = 'Password123';

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password });
    if (registerRes.status !== 201) {
      throw new Error(
        `Test setup failed: could not register user (${registerRes.status}: ${JSON.stringify(registerRes.body)})`,
      );
    }

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });
    if (loginRes.status !== 200) {
      throw new Error(
        `Test setup failed: could not login user (${loginRes.status}: ${JSON.stringify(loginRes.body)})`,
      );
    }
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Null out user preferences to release FK constraints before deleting regions/cantons
    await prisma.user.updateMany({
      where: {
        OR: [
          { preferredRegionId: { in: [region1Id, region2Id].filter(Boolean) } },
          { preferredCantonId: { in: [canton1Id, canton2Id].filter(Boolean) } },
        ],
      },
      data: { preferredRegionId: null, preferredCantonId: null },
    });

    // Cleanup test cantons then regions (FK order)
    if (canton1Id) await prisma.canton.delete({ where: { id: canton1Id } });
    if (canton2Id) await prisma.canton.delete({ where: { id: canton2Id } });
    if (region1Id) await prisma.region.delete({ where: { id: region1Id } });
    if (region2Id) await prisma.region.delete({ where: { id: region2Id } });
    await app.close();
  });

  describe('GET /users/me', () => {
    it('should return 401 when no token is provided', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when token is invalid', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 200 with full profile (no region/canton by default)', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('role');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('preferredRegion');
          expect(res.body).toHaveProperty('preferredCanton');
          expect(res.body).not.toHaveProperty('password');
          expect(res.body.preferredRegion).toBeNull();
          expect(res.body.preferredCanton).toBeNull();
        });
    });
  });

  describe('PATCH /users/me', () => {
    it('should return 401 when no token is provided', () => {
      return request(app.getHttpServer())
        .patch('/users/me')
        .send({ preferredRegionId: region1Id })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 200 and updated profile when setting valid preferredRegionId', () => {
      return request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ preferredRegionId: region1Id })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.preferredRegion).not.toBeNull();
          expect(res.body.preferredRegion.id).toBe(region1Id);
          expect(res.body.preferredRegion).toHaveProperty('name');
          expect(res.body.preferredRegion).toHaveProperty('code');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 200 and updated profile when setting valid preferredRegionId and preferredCantonId', () => {
      return request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ preferredRegionId: region1Id, preferredCantonId: canton1Id })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.preferredRegion.id).toBe(region1Id);
          expect(res.body.preferredCanton.id).toBe(canton1Id);
        });
    });

    it('should return 200 and clear preferences when sending null values', () => {
      return request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ preferredRegionId: null, preferredCantonId: null })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.preferredRegion).toBeNull();
          expect(res.body.preferredCanton).toBeNull();
        });
    });

    it('should return 404 when preferredRegionId does not exist', () => {
      return request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ preferredRegionId: '00000000-0000-0000-0000-000000000000' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 when preferredCantonId does not exist', () => {
      return request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ preferredCantonId: '00000000-0000-0000-0000-000000000000' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 when canton does not belong to provided region', () => {
      // canton2 belongs to region2 — passing region1 + canton2 → incoherent
      return request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ preferredRegionId: region1Id, preferredCantonId: canton2Id })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when preferredRegionId is not a valid UUID', () => {
      return request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ preferredRegionId: 'not-a-uuid' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
