import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';
import type { StringValue } from 'ms';
import type { AuthenticatedRequest } from './guards/jwt-access.guard';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        role: UserRole.USER,
      },
    });

    return this.toPublicUser(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const tokens = await this.issueTokens(user.id, user.role);

    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Refresh token invalide');
      }

      const tokens = await this.issueTokens(payload.sub, payload.role);
      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  async getCurrentUser(req: AuthenticatedRequest) {
    if (!req.user?.userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.toPublicUser(user);
  }

  private async issueTokens(userId: string, role: UserRole) {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const accessTtl = (process.env.JWT_ACCESS_TTL ?? '15m') as StringValue;
    const refreshTtl = (process.env.JWT_REFRESH_TTL ?? '7d') as StringValue;

    if (!accessSecret || !refreshSecret) {
      throw new Error(
        'JWT secrets manquants (JWT_ACCESS_SECRET / JWT_REFRESH_SECRET)',
      );
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, role },
      {
        secret: accessSecret,
        expiresIn: accessTtl,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, role, type: 'refresh' },
      {
        secret: refreshSecret,
        expiresIn: refreshTtl,
      },
    );

    return { accessToken, refreshToken };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    role: UserRole;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
