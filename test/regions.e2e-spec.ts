import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E tests for GET /regions and GET /regions/:id/cantons.
 * Public endpoints — no auth required.
 * Region + cantons created in beforeAll, cleaned up in afterAll.
 */
describe('RegionsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let regionId: string;
  let canton1Id: string;
  let canton2Id: string;

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

    const ts = Date.now();

    const region = await prisma.region.create({
      data: { name: `E2ERegion_${ts}`, code: `E2ER_${ts}` },
    });
    regionId = region.id;

    const c1 = await prisma.canton.create({
      data: { name: `E2ECanton1_${ts}`, code: `E2EC1_${ts}`, regionId },
    });
    canton1Id = c1.id;

    const c2 = await prisma.canton.create({
      data: { name: `E2ECanton2_${ts}`, code: `E2EC2_${ts}`, regionId },
    });
    canton2Id = c2.id;
  });

  afterAll(async () => {
    await prisma.canton.deleteMany({ where: { id: { in: [canton1Id, canton2Id] } } });
    await prisma.region.delete({ where: { id: regionId } });
    await app.close();
  });

  describe('GET /regions', () => {
    it('returns 200 without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get('/regions')
        .expect(HttpStatus.OK);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('includes the test region in results', async () => {
      const res = await request(app.getHttpServer())
        .get('/regions')
        .expect(HttpStatus.OK);

      const found = (res.body as { id: string }[]).find((r) => r.id === regionId);
      expect(found).toBeDefined();
      expect(found).toMatchObject({ id: regionId });
    });

    it('each region has id, name, code fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/regions')
        .expect(HttpStatus.OK);

      const region = (res.body as { id: string; name: string; code: string }[]).find(
        (r) => r.id === regionId,
      );
      expect(region).toHaveProperty('id');
      expect(region).toHaveProperty('name');
      expect(region).toHaveProperty('code');
    });
  });

  describe('GET /regions/:id/cantons', () => {
    it('returns 200 with cantons for valid region', async () => {
      const res = await request(app.getHttpServer())
        .get(`/regions/${regionId}/cantons`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = (res.body as { id: string }[]).map((c) => c.id);
      expect(ids).toContain(canton1Id);
      expect(ids).toContain(canton2Id);
    });

    it('each canton has id, name, code fields (no regionId)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/regions/${regionId}/cantons`)
        .expect(HttpStatus.OK);

      const canton = (res.body as { id: string; name: string; code: string }[]).find(
        (c) => c.id === canton1Id,
      );
      expect(canton).toHaveProperty('id');
      expect(canton).toHaveProperty('name');
      expect(canton).toHaveProperty('code');
      expect(canton).not.toHaveProperty('regionId');
    });

    it('returns 404 for unknown region id', async () => {
      await request(app.getHttpServer())
        .get('/regions/00000000-0000-0000-0000-000000000000/cantons')
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
