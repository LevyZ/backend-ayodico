import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RegionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRegions() {
    return this.prisma.region.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }

  async getCantons(regionId: string) {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
    });
    if (!region) throw new NotFoundException('Région introuvable');

    return this.prisma.canton.findMany({
      where: { regionId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }
}
