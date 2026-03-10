import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TranslationDirection } from '@prisma/client';
import { TranslationsController } from './translations.controller';
import { TranslationsService } from './translations.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-access.guard';
import type { CreateContributionDto } from './dto/create-contribution.dto';
import type { UpdateContributionDto } from './dto/update-contribution.dto';

const mockTranslationsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findMine: jest.fn(),
  requestUpdate: jest.fn(),
};

describe('TranslationsController', () => {
  let controller: TranslationsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslationsController],
      providers: [
        { provide: TranslationsService, useValue: mockTranslationsService },
      ],
    })
      .overrideGuard(JwtAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<TranslationsController>(TranslationsController);
  });

  describe('findAll', () => {
    it('delegates to service with query params', async () => {
      const expected = { data: [], total: 0, page: 1, limit: 20 };
      mockTranslationsService.findAll.mockResolvedValue(expected);

      const query = { direction: TranslationDirection.FR_TO_BHETE, page: 1, limit: 20 };
      const result = await controller.findAll(query);

      expect(mockTranslationsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toBe(expected);
    });

    it('delegates with empty query', async () => {
      const expected = { data: [], total: 0, page: 1, limit: 20 };
      mockTranslationsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll({});

      expect(mockTranslationsService.findAll).toHaveBeenCalledWith({});
      expect(result).toBe(expected);
    });
  });

  describe('findOne', () => {
    it('delegates to service with id param', async () => {
      const expected = { id: 'uuid-1', frenchTerm: 'soleil', bheteTerm: 'kpata', toneNotation: '2-3', direction: TranslationDirection.FR_TO_BHETE, contextOrMeaning: null, region: null, canton: null };
      mockTranslationsService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('uuid-1');

      expect(mockTranslationsService.findOne).toHaveBeenCalledWith('uuid-1');
      expect(result).toBe(expected);
    });

    it('propagates NotFoundException from service', async () => {
      mockTranslationsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMine', () => {
    it('delegates to service with userId from req.user', async () => {
      const expected = [{ id: 'c1', frenchTerm: 'soleil', status: 'PENDING' }];
      mockTranslationsService.findMine.mockResolvedValue(expected);

      const mockReq = { user: { userId: 'user-uuid-1', role: 'USER' } } as AuthenticatedRequest;
      const result = await controller.findMine(mockReq);

      expect(mockTranslationsService.findMine).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toBe(expected);
    });
  });

  describe('create', () => {
    it('delegates to service with userId and dto, returns 201 payload', async () => {
      const expected = {
        id: 'contrib-uuid-1',
        frenchTerm: 'soleil',
        bheteTerm: 'kpata',
        toneNotation: 'high-low',
        direction: TranslationDirection.FR_TO_BHETE,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      mockTranslationsService.create.mockResolvedValue(expected);

      const dto: CreateContributionDto = {
        frenchTerm: 'soleil',
        bheteTerm: 'kpata',
        toneNotation: 'high-low',
        direction: TranslationDirection.FR_TO_BHETE,
      };
      const mockReq = {
        user: { userId: 'user-uuid-1', role: 'USER' },
      } as AuthenticatedRequest;

      const result = await controller.create(dto, mockReq);

      expect(mockTranslationsService.create).toHaveBeenCalledWith('user-uuid-1', dto);
      expect(result).toBe(expected);
    });
  });

  describe('requestUpdate', () => {
    it('delegates to service with userId, id, and dto', async () => {
      const expected = { id: 't1', status: 'PENDING' };
      mockTranslationsService.requestUpdate.mockResolvedValue(expected);

      const dto: UpdateContributionDto = { frenchTerm: 'nouveau' };
      const mockReq = { user: { userId: 'user-uuid-1', role: 'USER' } } as AuthenticatedRequest;

      const result = await controller.requestUpdate('t1', dto, mockReq);

      expect(mockTranslationsService.requestUpdate).toHaveBeenCalledWith('user-uuid-1', 't1', dto);
      expect(result).toBe(expected);
    });
  });
});
