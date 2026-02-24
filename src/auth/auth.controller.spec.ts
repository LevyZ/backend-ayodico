import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessGuard } from './guards/jwt-access.guard';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

  describe('login', () => {
    const dto = { email: 'user@example.com', password: 'Password123' };
    const loginResult = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'uuid-1', email: 'user@example.com', role: 'USER', createdAt: '2026-01-01T00:00:00.000Z' },
    };

    it('should call authService.login and return tokens + user', async () => {
      mockAuthService.login.mockResolvedValue(loginResult);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(loginResult);
    });
  });

  describe('refresh', () => {
    const dto = { refreshToken: 'valid-refresh-token' };
    const refreshResult = { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' };

    it('should call authService.refresh and return new tokens', async () => {
      mockAuthService.refresh.mockResolvedValue(refreshResult);

      const result = await controller.refresh(dto);

      expect(mockAuthService.refresh).toHaveBeenCalledWith('valid-refresh-token');
      expect(result).toEqual(refreshResult);
    });
  });

  describe('me', () => {
    const publicUser = { id: 'uuid-1', email: 'user@example.com', role: 'USER', createdAt: '2026-01-01T00:00:00.000Z' };

    it('should call authService.getCurrentUser and return public profile', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(publicUser);
      const req = { user: { userId: 'uuid-1', role: 'USER' } } as any;

      const result = await controller.me(req);

      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(req);
      expect(result).toEqual(publicUser);
      expect(result).not.toHaveProperty('password');
    });
  });
});
