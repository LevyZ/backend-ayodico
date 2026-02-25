import { Test, TestingModule } from '@nestjs/testing';
import { TranslationDirection } from '@prisma/client';
import { TranslationsController } from './translations.controller';
import { TranslationsService } from './translations.service';

const mockTranslationsService = {
  findAll: jest.fn(),
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
    }).compile();
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
});
