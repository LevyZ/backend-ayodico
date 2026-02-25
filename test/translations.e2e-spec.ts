import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E tests for GET /translations.
 * Public endpoint — no auth required.
 * Translations are created in beforeAll and cleaned up in afterAll.
 */
describe('TranslationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tFrId: string;       // APPROVED FR_TO_BHETE, no region
  let tBhId: string;       // APPROVED BHETE_TO_FR, no region
  let tPendingId: string;  // PENDING — must NOT appear in results
  let tRegionId: string;   // APPROVED FR_TO_BHETE, with region
  let testRegionId: string; // region for filtering test

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

    const tFr = await prisma.translation.create({
      data: {
        frenchTerm: `bonjour_${ts}`,
        bheteTerm: `bhete_fr_${ts}`,
        toneNotation: '1-2',
        direction: 'FR_TO_BHETE',
        status: 'APPROVED',
      },
    });
    tFrId = tFr.id;

    const tBh = await prisma.translation.create({
      data: {
        frenchTerm: `merci_fr_${ts}`,
        bheteTerm: `bhete_bh_${ts}`,
        toneNotation: '2-1',
        direction: 'BHETE_TO_FR',
        status: 'APPROVED',
      },
    });
    tBhId = tBh.id;

    const tPending = await prisma.translation.create({
      data: {
        frenchTerm: `pending_fr_${ts}`,
        bheteTerm: `pending_bh_${ts}`,
        toneNotation: '1',
        direction: 'FR_TO_BHETE',
        status: 'PENDING',
      },
    });
    tPendingId = tPending.id;

    // Create region for filtering test
    const testRegion = await prisma.region.create({
      data: { name: `TranslTestRegion_${ts}`, code: `TTR_${ts}` },
    });
    testRegionId = testRegion.id;

    const tRegion = await prisma.translation.create({
      data: {
        frenchTerm: `region_fr_${ts}`,
        bheteTerm: `region_bh_${ts}`,
        toneNotation: '3',
        direction: 'FR_TO_BHETE',
        status: 'APPROVED',
        regionId: testRegionId,
      },
    });
    tRegionId = tRegion.id;
  });

  afterAll(async () => {
    await prisma.translation.deleteMany({
      where: { id: { in: [tFrId, tBhId, tPendingId, tRegionId] } },
    });
    await prisma.region.delete({ where: { id: testRegionId } });
    await app.close();
  });

  describe('GET /translations', () => {
    it('returns 200 without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get('/translations')
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
    });

    it('does not return PENDING translations', async () => {
      const res = await request(app.getHttpServer())
        .get('/translations')
        .expect(HttpStatus.OK);

      const ids = (res.body.data as { id: string }[]).map((t) => t.id);
      expect(ids).not.toContain(tPendingId);
    });

    it('returns both APPROVED directions when no filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/translations')
        .expect(HttpStatus.OK);

      const ids = (res.body.data as { id: string }[]).map((t) => t.id);
      expect(ids).toContain(tFrId);
      expect(ids).toContain(tBhId);
    });

    it('filters by direction FR_TO_BHETE', async () => {
      const res = await request(app.getHttpServer())
        .get('/translations?direction=FR_TO_BHETE')
        .expect(HttpStatus.OK);

      const items = res.body.data as { id: string; direction: string }[];
      expect(items.find((t) => t.id === tFrId)).toBeDefined();
      expect(items.find((t) => t.id === tBhId)).toBeUndefined();
      items.forEach((t) => expect(t.direction).toBe('FR_TO_BHETE'));
    });

    it('filters by direction BHETE_TO_FR', async () => {
      const res = await request(app.getHttpServer())
        .get('/translations?direction=BHETE_TO_FR')
        .expect(HttpStatus.OK);

      const items = res.body.data as { id: string; direction: string }[];
      expect(items.find((t) => t.id === tBhId)).toBeDefined();
      expect(items.find((t) => t.id === tFrId)).toBeUndefined();
      items.forEach((t) => expect(t.direction).toBe('BHETE_TO_FR'));
    });

    it('applies pagination — limit=1 returns exactly 1 item', async () => {
      const res = await request(app.getHttpServer())
        .get('/translations?limit=1&page=1')
        .expect(HttpStatus.OK);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.limit).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });

    it('returns 400 for invalid direction value', async () => {
      await request(app.getHttpServer())
        .get('/translations?direction=INVALID')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 400 for non-numeric page', async () => {
      await request(app.getHttpServer())
        .get('/translations?page=abc')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 400 for limit exceeding max (101)', async () => {
      await request(app.getHttpServer())
        .get('/translations?limit=101')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('filters by regionId — returns only translations of that region', async () => {
      const res = await request(app.getHttpServer())
        .get(`/translations?regionId=${testRegionId}`)
        .expect(HttpStatus.OK);

      const ids = (res.body.data as { id: string }[]).map((t) => t.id);
      expect(ids).toContain(tRegionId);
      expect(ids).not.toContain(tFrId);
      expect(ids).not.toContain(tBhId);
    });
  });
});
