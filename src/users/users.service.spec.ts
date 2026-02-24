import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockRegion = { id: 'region-uuid', name: 'Centre', code: 'CTR' };
const mockCanton = {
  id: 'canton-uuid',
  name: 'Yaoundé',
  code: 'YDE',
  regionId: 'region-uuid',
};
const mockUser = {
  id: 'user-uuid',
  email: 'user@example.com',
  role: 'USER',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  preferredRegion: null,
  preferredCanton: null,
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  region: {
    findUnique: jest.fn(),
  },
  canton: {
    findUnique: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('getProfile()', () => {
    it('should return public profile without password (no region/canton)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-uuid');

      expect(result).toEqual({
        id: 'user-uuid',
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2026-01-01T00:00:00.000Z',
        preferredRegion: null,
        preferredCanton: null,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should return profile with preferredRegion and preferredCanton', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        preferredRegion: mockRegion,
        preferredCanton: mockCanton,
      });

      const result = await service.getProfile('user-uuid');

      expect(result.preferredRegion).toEqual({
        id: 'region-uuid',
        name: 'Centre',
        code: 'CTR',
      });
      expect(result.preferredCanton).toEqual({
        id: 'canton-uuid',
        name: 'Yaoundé',
        code: 'YDE',
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should query prisma with include for region and canton', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.getProfile('user-uuid');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid' },
        include: { preferredRegion: true, preferredCanton: true },
      });
    });
  });

  describe('updatePreferences()', () => {
    it('should update both preferredRegionId and preferredCantonId', async () => {
      mockPrismaService.region.findUnique.mockResolvedValue(mockRegion);
      mockPrismaService.canton.findUnique.mockResolvedValue(mockCanton);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        preferredRegion: mockRegion,
        preferredCanton: mockCanton,
      });

      const result = await service.updatePreferences('user-uuid', {
        preferredRegionId: 'region-uuid',
        preferredCantonId: 'canton-uuid',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid' },
        data: {
          preferredRegionId: 'region-uuid',
          preferredCantonId: 'canton-uuid',
        },
        include: { preferredRegion: true, preferredCanton: true },
      });
      expect(result.preferredRegion).toEqual({
        id: 'region-uuid',
        name: 'Centre',
        code: 'CTR',
      });
      // No extra findUnique call — update includes the relations
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when preferredRegionId does not exist', async () => {
      mockPrismaService.region.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePreferences('user-uuid', { preferredRegionId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when preferredCantonId does not exist', async () => {
      mockPrismaService.canton.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePreferences('user-uuid', { preferredCantonId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when canton does not belong to region', async () => {
      mockPrismaService.region.findUnique.mockResolvedValue(mockRegion);
      mockPrismaService.canton.findUnique.mockResolvedValue({
        ...mockCanton,
        regionId: 'other-region-uuid',
      });

      await expect(
        service.updatePreferences('user-uuid', {
          preferredRegionId: 'region-uuid',
          preferredCantonId: 'canton-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set preferences to null (clear)', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.updatePreferences('user-uuid', {
        preferredRegionId: null,
        preferredCantonId: null,
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid' },
        data: { preferredRegionId: null, preferredCantonId: null },
        include: { preferredRegion: true, preferredCanton: true },
      });
      expect(result.preferredRegion).toBeNull();
      expect(result.preferredCanton).toBeNull();
    });

    it('should not validate region/canton when not provided (undefined)', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.updatePreferences('user-uuid', {});

      expect(mockPrismaService.region.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.canton.findUnique).not.toHaveBeenCalled();
    });

    it('should not check coherence when only cantonId is provided without regionId', async () => {
      mockPrismaService.canton.findUnique.mockResolvedValue(mockCanton);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        preferredCanton: mockCanton,
      });

      // No BadRequestException expected — coherence only checked when both are provided
      const result = await service.updatePreferences('user-uuid', {
        preferredCantonId: 'canton-uuid',
      });
      expect(result.preferredCanton).toMatchObject({ id: 'canton-uuid' });
    });
  });
});
