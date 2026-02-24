import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function makeContext(role: UserRole | undefined, requiredRoles: UserRole[] | undefined) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles as any);

  const guard = new RolesGuard(reflector);

  const mockContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: role ? { userId: 'uuid-1', role } : undefined,
      }),
    }),
  } as any;

  return { guard, mockContext };
}

describe('RolesGuard', () => {
  describe('when no roles are required', () => {
    it('should allow access (no @Roles decorator)', () => {
      const { guard, mockContext } = makeContext(UserRole.USER, undefined);
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should allow access (empty roles array)', () => {
      const { guard, mockContext } = makeContext(UserRole.USER, []);
      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('when @Roles(ADMIN) is required', () => {
    it('should deny USER with ForbiddenException', () => {
      const { guard, mockContext } = makeContext(UserRole.USER, [UserRole.ADMIN]);
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should allow ADMIN', () => {
      const { guard, mockContext } = makeContext(UserRole.ADMIN, [UserRole.ADMIN]);
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should allow SUPER_ADMIN', () => {
      const { guard, mockContext } = makeContext(UserRole.SUPER_ADMIN, [UserRole.ADMIN]);
      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('when @Roles(USER) is required', () => {
    it('should allow USER', () => {
      const { guard, mockContext } = makeContext(UserRole.USER, [UserRole.USER]);
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should allow ADMIN on a USER route', () => {
      const { guard, mockContext } = makeContext(UserRole.ADMIN, [UserRole.USER]);
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should allow SUPER_ADMIN on a USER route', () => {
      const { guard, mockContext } = makeContext(UserRole.SUPER_ADMIN, [UserRole.USER]);
      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('when @Roles(SUPER_ADMIN) is required', () => {
    it('should deny USER', () => {
      const { guard, mockContext } = makeContext(UserRole.USER, [UserRole.SUPER_ADMIN]);
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should deny ADMIN', () => {
      const { guard, mockContext } = makeContext(UserRole.ADMIN, [UserRole.SUPER_ADMIN]);
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN', () => {
      const { guard, mockContext } = makeContext(UserRole.SUPER_ADMIN, [UserRole.SUPER_ADMIN]);
      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('when no user on request (guard applied without JwtAccessGuard)', () => {
    it('should throw ForbiddenException', () => {
      const { guard, mockContext } = makeContext(undefined, [UserRole.ADMIN]);
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });
});
