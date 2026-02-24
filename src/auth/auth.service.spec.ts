import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('token'),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto = { email: 'user@example.com', password: 'Password123' };
    const createdUser = {
      id: 'uuid-1',
      email: 'user@example.com',
      password: 'hashed',
      role: UserRole.USER,
      preferredRegionId: null,
      preferredCantonId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    it('should create user and return public fields without password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.register(dto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'user@example.com',
          password: expect.any(String),
          role: UserRole.USER,
        },
      });
      expect(result).toEqual({
        id: 'uuid-1',
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should normalize email to lowercase and trim', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...createdUser,
        email: '  User@Example.COM  '.toLowerCase().trim(),
      });

      await service.register({
        email: '  User@Example.COM  ',
        password: 'Password123',
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'user@example.com',
        }),
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow('Cet email est déjà utilisé');
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { email: 'user@example.com', password: 'Password123' };
    const hashedPassword = bcrypt.hashSync('Password123', 1);
    const existingUser = {
      id: 'uuid-1',
      email: 'user@example.com',
      password: hashedPassword,
      role: UserRole.USER,
      preferredRegionId: null,
      preferredCantonId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    beforeEach(() => {
      process.env.JWT_ACCESS_SECRET = 'test-access-secret';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    });

    it('should return accessToken, refreshToken and public user on success', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(dto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'uuid-1',
          email: 'user@example.com',
          role: 'USER',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException with generic message when email not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Identifiants invalides');
    });

    it('should throw UnauthorizedException with generic message when password is wrong', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...existingUser,
        password: bcrypt.hashSync('OtherPassword123', 10),
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Identifiants invalides');
    });

    it('should normalize email before lookup', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockJwtService.signAsync.mockResolvedValue('token');

      await service.login({ email: '  User@Example.COM  ', password: 'Password123' });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      process.env.JWT_ACCESS_SECRET = 'test-access-secret';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    });

    it('should return a new accessToken when refresh token is valid', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'uuid-1',
        role: UserRole.USER,
        type: 'refresh',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'uuid-1',
        role: UserRole.USER,
        type: 'access',
      });

      await expect(service.refresh('wrong-type-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh('wrong-type-token')).rejects.toThrow('Refresh token invalide');
    });

    it('should throw UnauthorizedException when token is expired or forged', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh('expired-token')).rejects.toThrow('Refresh token invalide ou expiré');
    });
  });
});
