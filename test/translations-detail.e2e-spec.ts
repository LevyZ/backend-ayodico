import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E tests for GET /translations/:id — detail feature (story 3.5).
 * Separate spec to avoid exceeding throttler in-memory counter.
 * Uses timestamp-unique terms to avoid collisions with other test data.
 */
describe('TranslationsController detail (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tDetailId: string;
  let tDetailFrenchTerm: string;

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

    const tDetail = await prisma.translation.create({
      data: {
        frenchTerm: `arbre_${ts}`,
        bheteTerm: `kpata_detail_${ts}`,
        toneNotation: '3-1',
        direction: 'FR_TO_BHETE',
        status: 'APPROVED',
        contextOrMeaning: `Utilisé en contexte forestier ${ts}`,
      },
    });
    tDetailId = tDetail.id;
    tDetailFrenchTerm = tDetail.frenchTerm;
  });

  afterAll(async () => {
    await prisma.translation.deleteMany({
      where: { id: tDetailId },
    });
    await app.close();
  });

  describe('GET /translations/:id', () => {
    it('returns 200 with full detail for existing APPROVED translation', async () => {
      const res = await request(app.getHttpServer())
        .get(`/translations/${tDetailId}`)
        .expect(HttpStatus.OK);

      expect(res.body.id).toBe(tDetailId);
      expect(res.body.frenchTerm).toBe(tDetailFrenchTerm);
      expect(res.body).toHaveProperty('bheteTerm');
      expect(res.body).toHaveProperty('toneNotation');
      expect(res.body).toHaveProperty('direction');
      expect(res.body).toHaveProperty('contextOrMeaning');
      expect(res.body.contextOrMeaning).toContain('Utilisé en contexte forestier');
      expect(res.body).toHaveProperty('region');
      expect(res.body).toHaveProperty('canton');
    });

    it('returns 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get('/translations/00000000-0000-0000-0000-000000000000')
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
