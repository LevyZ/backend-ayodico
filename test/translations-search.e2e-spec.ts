import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E tests for GET /translations — search feature (story 3.4).
 * Separate spec to avoid exceeding throttler in-memory counter.
 * Uses timestamp-unique terms to avoid collisions with other test data.
 */
describe('TranslationsController search (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tSearchFrId: string;    // APPROVED FR_TO_BHETE — searchable by frenchTerm
  let tSearchFrTerm: string;  // stored to avoid extra DB query in test
  let tSearchBhId: string;    // APPROVED BHETE_TO_FR — searchable by bheteTerm
  let tSearchBhTerm: string;  // stored to avoid extra DB query in test

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

    const tSearchFr = await prisma.translation.create({
      data: {
        frenchTerm: `soleil_${ts}`,
        bheteTerm: `kpata_bh_${ts}`,
        toneNotation: '2',
        direction: 'FR_TO_BHETE',
        status: 'APPROVED',
      },
    });
    tSearchFrId = tSearchFr.id;
    tSearchFrTerm = tSearchFr.frenchTerm;

    const tSearchBh = await prisma.translation.create({
      data: {
        frenchTerm: `lune_fr_${ts}`,
        bheteTerm: `nyoli_${ts}`,
        toneNotation: '1',
        direction: 'BHETE_TO_FR',
        status: 'APPROVED',
      },
    });
    tSearchBhId = tSearchBh.id;
    tSearchBhTerm = tSearchBh.bheteTerm;
  });

  afterAll(async () => {
    await prisma.translation.deleteMany({
      where: { id: { in: [tSearchFrId, tSearchBhId] } },
    });
    await app.close();
  });

  describe('GET /translations?search=', () => {
    it('returns only matching translation when searching by unique frenchTerm', async () => {
      const res = await request(app.getHttpServer())
        .get(`/translations?search=${encodeURIComponent(tSearchFrTerm)}`)
        .expect(HttpStatus.OK);

      const ids = (res.body.data as { id: string }[]).map((t) => t.id);
      expect(ids).toContain(tSearchFrId);
      expect(ids).not.toContain(tSearchBhId);
    });

    it('is case-insensitive — uppercase search matches lowercase bheteTerm', async () => {
      const res = await request(app.getHttpServer())
        .get(`/translations?search=${encodeURIComponent(tSearchBhTerm.toUpperCase())}`)
        .expect(HttpStatus.OK);

      const ids = (res.body.data as { id: string }[]).map((t) => t.id);
      expect(ids).toContain(tSearchBhId);
    });

    it('returns empty data for a search term that matches nothing', async () => {
      const res = await request(app.getHttpServer())
        .get('/translations?search=xyzzy_terme_introuvable_12345')
        .expect(HttpStatus.OK);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });
});
