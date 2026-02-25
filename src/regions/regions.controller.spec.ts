import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RegionsController } from './regions.controller';
import { RegionsService } from './regions.service';

const mockRegionsService = {
  getRegions: jest.fn(),
  getCantons: jest.fn(),
};

describe('RegionsController', () => {
  let controller: RegionsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegionsController],
      providers: [{ provide: RegionsService, useValue: mockRegionsService }],
    }).compile();
    controller = module.get<RegionsController>(RegionsController);
  });

  describe('getRegions', () => {
    it('delegates to service and returns result', async () => {
      const expected = [{ id: 'r1', name: 'Région A', code: 'RA' }];
      mockRegionsService.getRegions.mockResolvedValue(expected);

      const result = await controller.getRegions();

      expect(mockRegionsService.getRegions).toHaveBeenCalled();
      expect(result).toBe(expected);
    });
  });

  describe('getCantons', () => {
    it('delegates to service with region id', async () => {
      const expected = [{ id: 'c1', name: 'Canton A', code: 'CA' }];
      mockRegionsService.getCantons.mockResolvedValue(expected);

      const result = await controller.getCantons('r1');

      expect(mockRegionsService.getCantons).toHaveBeenCalledWith('r1');
      expect(result).toBe(expected);
    });

    it('propagates NotFoundException from service', async () => {
      mockRegionsService.getCantons.mockRejectedValue(new NotFoundException());

      await expect(controller.getCantons('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
