import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAccessGuard, AuthenticatedRequest } from '../auth/guards/jwt-access.guard';

const mockPublicProfile = {
  id: 'user-uuid',
  email: 'user@example.com',
  role: 'USER',
  createdAt: '2026-01-01T00:00:00.000Z',
  preferredRegion: null,
  preferredCanton: null,
};

const mockUsersService = {
  getProfile: jest.fn(),
  updatePreferences: jest.fn(),
};

const mockRequest = (userId: string): AuthenticatedRequest =>
  ({ user: { userId, role: 'USER' } }) as unknown as AuthenticatedRequest;

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('GET /users/me — getProfile()', () => {
    it('should return the public profile for the authenticated user', async () => {
      mockUsersService.getProfile.mockResolvedValue(mockPublicProfile);

      const result = await controller.getProfile(mockRequest('user-uuid'));

      expect(mockUsersService.getProfile).toHaveBeenCalledWith('user-uuid');
      expect(result).toEqual(mockPublicProfile);
    });
  });

  describe('PATCH /users/me — updatePreferences()', () => {
    it('should call updatePreferences with userId and dto', async () => {
      const updatedProfile = {
        ...mockPublicProfile,
        preferredRegion: { id: 'region-uuid', name: 'Centre', code: 'CTR' },
      };
      mockUsersService.updatePreferences.mockResolvedValue(updatedProfile);

      const dto = { preferredRegionId: 'region-uuid' };
      const result = await controller.updatePreferences(mockRequest('user-uuid'), dto);

      expect(mockUsersService.updatePreferences).toHaveBeenCalledWith('user-uuid', dto);
      expect(result).toEqual(updatedProfile);
    });
  });
});
