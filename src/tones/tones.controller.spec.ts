import { Test, TestingModule } from '@nestjs/testing';
import { TonesController } from './tones.controller';
import { TonesService } from './tones.service';

const mockTonesService = { findAll: jest.fn() };

describe('TonesController', () => {
  let controller: TonesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TonesController],
      providers: [{ provide: TonesService, useValue: mockTonesService }],
    }).compile();
    controller = module.get<TonesController>(TonesController);
  });

  describe('findAll', () => {
    it('delegates to service and returns result', async () => {
      const expected = [{ id: 't1', code: 'high', name: 'Haut', displaySymbol: '↑' }];
      mockTonesService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(mockTonesService.findAll).toHaveBeenCalled();
      expect(result).toBe(expected);
    });

    it('returns empty array when service returns none', async () => {
      mockTonesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(mockTonesService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
