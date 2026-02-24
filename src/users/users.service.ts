import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferredRegion: true,
        preferredCanton: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.toPublicProfile(user);
  }

  async updatePreferences(userId: string, dto: UpdateProfileDto) {
    if (dto.preferredRegionId !== undefined && dto.preferredRegionId !== null) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.preferredRegionId },
      });
      if (!region) {
        throw new NotFoundException('Région introuvable');
      }
    }

    if (dto.preferredCantonId !== undefined && dto.preferredCantonId !== null) {
      const canton = await this.prisma.canton.findUnique({
        where: { id: dto.preferredCantonId },
      });
      if (!canton) {
        throw new NotFoundException('Canton introuvable');
      }

      if (
        dto.preferredRegionId !== undefined &&
        dto.preferredRegionId !== null &&
        canton.regionId !== dto.preferredRegionId
      ) {
        throw new BadRequestException(
          'Le canton ne fait pas partie de la région indiquée',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferredRegionId: dto.preferredRegionId,
        preferredCantonId: dto.preferredCantonId,
      },
      include: {
        preferredRegion: true,
        preferredCanton: true,
      },
    });

    return this.toPublicProfile(updated);
  }

  private toPublicProfile(user: {
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    preferredRegion: { id: string; name: string; code: string } | null;
    preferredCanton: { id: string; name: string; code: string } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      preferredRegion: user.preferredRegion
        ? {
            id: user.preferredRegion.id,
            name: user.preferredRegion.name,
            code: user.preferredRegion.code,
          }
        : null,
      preferredCanton: user.preferredCanton
        ? {
            id: user.preferredCanton.id,
            name: user.preferredCanton.name,
            code: user.preferredCanton.code,
          }
        : null,
    };
  }
}
