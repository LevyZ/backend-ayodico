import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
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

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
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

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
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

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'user@example.com',
        }),
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow('Cet email est déjà utilisé');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});
