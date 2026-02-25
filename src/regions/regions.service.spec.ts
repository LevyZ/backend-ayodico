import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RegionsService } from './regions.service';

const mockPrismaService = {
  region: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  canton: {
    findMany: jest.fn(),
  },
};

describe('RegionsService', () => {
  let service: RegionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<RegionsService>(RegionsService);
  });

  describe('getRegions', () => {
    it('returns all regions ordered by name', async () => {
      const regions = [
        { id: 'r1', name: 'Région A', code: 'RA' },
        { id: 'r2', name: 'Région B', code: 'RB' },
      ];
      mockPrismaService.region.findMany.mockResolvedValue(regions);

      const result = await service.getRegions();

      expect(mockPrismaService.region.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true },
      });
      expect(result).toEqual(regions);
    });

    it('returns empty array when no regions', async () => {
      mockPrismaService.region.findMany.mockResolvedValue([]);

      const result = await service.getRegions();

      expect(result).toHaveLength(0);
    });
  });

  describe('getCantons', () => {
    it('returns cantons for a valid region', async () => {
      mockPrismaService.region.findUnique.mockResolvedValue({ id: 'r1', name: 'Région A', code: 'RA' });
      const cantons = [
        { id: 'c1', name: 'Canton A', code: 'CA' },
        { id: 'c2', name: 'Canton B', code: 'CB' },
      ];
      mockPrismaService.canton.findMany.mockResolvedValue(cantons);

      const result = await service.getCantons('r1');

      expect(mockPrismaService.canton.findMany).toHaveBeenCalledWith({
        where: { regionId: 'r1' },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true },
      });
      expect(result).toEqual(cantons);
    });

    it('throws NotFoundException for unknown region', async () => {
      mockPrismaService.region.findUnique.mockResolvedValue(null);

      await expect(service.getCantons('unknown-id')).rejects.toThrow(NotFoundException);
    });

    it('returns empty array for region with no cantons', async () => {
      mockPrismaService.region.findUnique.mockResolvedValue({ id: 'r1', name: 'Région A', code: 'RA' });
      mockPrismaService.canton.findMany.mockResolvedValue([]);

      const result = await service.getCantons('r1');

      expect(result).toHaveLength(0);
    });
  });
});
