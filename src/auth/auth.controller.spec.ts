import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const dto = { email: 'user@example.com', password: 'Password123' };
    const publicUser = {
      id: 'uuid-1',
      email: 'user@example.com',
      role: 'USER',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    it('should call authService.register and return result', async () => {
      mockAuthService.register.mockResolvedValue(publicUser);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(publicUser);
    });
  });
});
