import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E tests for GET /tones.
 * Public endpoint — no auth required.
 * Uses seeded reference tones (high, neutral, low) — no test data setup needed.
 */
describe('TonesController (e2e)', () => {
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

  describe('GET /tones', () => {
    it('returns 200 without authentication', async () => {
      await request(app.getHttpServer()).get('/tones').expect(HttpStatus.OK);
    });

    it('returns an array', async () => {
      const res = await request(app.getHttpServer()).get('/tones').expect(HttpStatus.OK);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('each tone has id, code, name, displaySymbol fields', async () => {
      const res = await request(app.getHttpServer()).get('/tones').expect(HttpStatus.OK);
      const tones = res.body as { id: string; code: string; name: string; displaySymbol: string }[];
      expect(tones.length).toBeGreaterThan(0);
      tones.forEach((t) => {
        expect(t).toHaveProperty('id');
        expect(t).toHaveProperty('code');
        expect(t).toHaveProperty('name');
        expect(t).toHaveProperty('displaySymbol');
      });
    });

    it('contains the 3 seeded reference tones (high, neutral, low)', async () => {
      const res = await request(app.getHttpServer()).get('/tones').expect(HttpStatus.OK);
      const codes = (res.body as { code: string }[]).map((t) => t.code);
      expect(codes).toContain('high');
      expect(codes).toContain('neutral');
      expect(codes).toContain('low');
    });

    it('returns tones ordered by code ascending', async () => {
      const res = await request(app.getHttpServer()).get('/tones').expect(HttpStatus.OK);
      const codes = (res.body as { code: string }[]).map((t) => t.code);
      expect(codes).toEqual([...codes].sort());
    });

    it('does not expose createdAt or updatedAt fields', async () => {
      const res = await request(app.getHttpServer()).get('/tones').expect(HttpStatus.OK);
      const tones = res.body as object[];
      tones.forEach((t) => {
        expect(t).not.toHaveProperty('createdAt');
        expect(t).not.toHaveProperty('updatedAt');
      });
    });
  });
});
