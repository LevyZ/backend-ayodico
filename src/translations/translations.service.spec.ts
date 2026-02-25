import { Test, TestingModule } from '@nestjs/testing';
import { TranslationDirection, TranslationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationsService } from './translations.service';

const mockPrismaService = {
  translation: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const makeRow = (
  id: string,
  direction: TranslationDirection = TranslationDirection.FR_TO_BHETE,
) => ({
  id,
  frenchTerm: `french_${id}`,
  bheteTerm: `bhete_${id}`,
  toneNotation: '1-2',
  direction,
  status: TranslationStatus.APPROVED,
  region: null,
  canton: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  contributorId: null,
  regionId: null,
  cantonId: null,
  approvedById: null,
  contextOrMeaning: null,
});

describe('TranslationsService', () => {
  let service: TranslationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<TranslationsService>(TranslationsService);
  });

  describe('findAll', () => {
    it('returns approved translations with defaults (no filter)', async () => {
      const rows = [makeRow('1'), makeRow('2', TranslationDirection.BHETE_TO_FR)];
      mockPrismaService.translation.findMany.mockResolvedValue(rows);
      mockPrismaService.translation.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: TranslationStatus.APPROVED },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data).toHaveLength(2);
    });

    it('filters by direction FR_TO_BHETE', async () => {
      const rows = [makeRow('1', TranslationDirection.FR_TO_BHETE)];
      mockPrismaService.translation.findMany.mockResolvedValue(rows);
      mockPrismaService.translation.count.mockResolvedValue(1);

      const result = await service.findAll({
        direction: TranslationDirection.FR_TO_BHETE,
      });

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: TranslationStatus.APPROVED,
            direction: TranslationDirection.FR_TO_BHETE,
          },
        }),
      );
      expect(result.data[0].direction).toBe(TranslationDirection.FR_TO_BHETE);
    });

    it('filters by direction BHETE_TO_FR', async () => {
      const rows = [makeRow('2', TranslationDirection.BHETE_TO_FR)];
      mockPrismaService.translation.findMany.mockResolvedValue(rows);
      mockPrismaService.translation.count.mockResolvedValue(1);

      await service.findAll({ direction: TranslationDirection.BHETE_TO_FR });

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: TranslationStatus.APPROVED,
            direction: TranslationDirection.BHETE_TO_FR,
          },
        }),
      );
    });

    it('applies pagination correctly', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue([makeRow('3')]);
      mockPrismaService.translation.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(50);
    });

    it('includes region and canton in response', async () => {
      const row = {
        ...makeRow('4'),
        region: { id: 'r1', name: 'Région A', code: 'RA', createdAt: new Date(), updatedAt: new Date() },
        canton: { id: 'c1', name: 'Canton A', code: 'CA', regionId: 'r1', createdAt: new Date(), updatedAt: new Date() },
      };
      mockPrismaService.translation.findMany.mockResolvedValue([row]);
      mockPrismaService.translation.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data[0].region).toEqual({ id: 'r1', name: 'Région A', code: 'RA' });
      expect(result.data[0].canton).toEqual({ id: 'c1', name: 'Canton A', code: 'CA' });
    });

    it('returns null for region and canton when absent', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue([makeRow('5')]);
      mockPrismaService.translation.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data[0].region).toBeNull();
      expect(result.data[0].canton).toBeNull();
    });

    it('returns empty data array when no translations', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue([]);
      mockPrismaService.translation.count.mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('filters by regionId', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue([makeRow('6')]);
      mockPrismaService.translation.count.mockResolvedValue(1);

      await service.findAll({ regionId: 'region-uuid-1' });

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: TranslationStatus.APPROVED,
            regionId: 'region-uuid-1',
          },
        }),
      );
    });

    it('filters by cantonId', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue([makeRow('7')]);
      mockPrismaService.translation.count.mockResolvedValue(1);

      await service.findAll({ cantonId: 'canton-uuid-1' });

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: TranslationStatus.APPROVED,
            cantonId: 'canton-uuid-1',
          },
        }),
      );
    });

    it('filters by regionId and cantonId combined', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue([makeRow('8')]);
      mockPrismaService.translation.count.mockResolvedValue(1);

      await service.findAll({ regionId: 'region-uuid-1', cantonId: 'canton-uuid-1' });

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: TranslationStatus.APPROVED,
            regionId: 'region-uuid-1',
            cantonId: 'canton-uuid-1',
          },
        }),
      );
    });
  });
});
