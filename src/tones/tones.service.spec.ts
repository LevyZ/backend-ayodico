import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TonesService } from './tones.service';

const mockPrismaService = {
  tone: { findMany: jest.fn() },
};

describe('TonesService', () => {
  let service: TonesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TonesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<TonesService>(TonesService);
  });

  describe('findAll', () => {
    it('returns all tones ordered by code', async () => {
      const tones = [
        { id: 't1', code: 'high',    name: 'Haut',   displaySymbol: '↑' },
        { id: 't2', code: 'low',     name: 'Bas',    displaySymbol: '↓' },
        { id: 't3', code: 'neutral', name: 'Neutre', displaySymbol: '→' },
      ];
      mockPrismaService.tone.findMany.mockResolvedValue(tones);

      const result = await service.findAll();

      expect(mockPrismaService.tone.findMany).toHaveBeenCalledWith({
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true, displaySymbol: true },
      });
      expect(result).toEqual(tones);
    });

    it('returns empty array when no tones', async () => {
      mockPrismaService.tone.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(mockPrismaService.tone.findMany).toHaveBeenCalledWith({
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true, displaySymbol: true },
      });
      expect(result).toHaveLength(0);
    });
  });
});
