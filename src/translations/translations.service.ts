import { Injectable, NotFoundException } from '@nestjs/common';
import { TranslationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ListTranslationsDto } from './dto/list-translations.dto';

@Injectable()
export class TranslationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: ListTranslationsDto) {
    const { direction, page = 1, limit = 20, regionId, cantonId, search } = dto;
    const where = {
      status: TranslationStatus.APPROVED,
      ...(direction ? { direction } : {}),
      ...(regionId ? { regionId } : {}),
      ...(cantonId ? { cantonId } : {}),
      ...(search
        ? {
            OR: [
              { frenchTerm: { contains: search, mode: 'insensitive' as const } },
              { bheteTerm: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.translation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { region: true, canton: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.translation.count({ where }),
    ]);

    return {
      data: rows.map((t) => ({
        id: t.id,
        frenchTerm: t.frenchTerm,
        bheteTerm: t.bheteTerm,
        toneNotation: t.toneNotation,
        direction: t.direction,
        region: t.region
          ? { id: t.region.id, name: t.region.name, code: t.region.code }
          : null,
        canton: t.canton
          ? { id: t.canton.id, name: t.canton.name, code: t.canton.code }
          : null,
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const translation = await this.prisma.translation.findFirst({
      where: { id, status: TranslationStatus.APPROVED },
      include: { region: true, canton: true },
    });

    if (!translation) {
      throw new NotFoundException('Traduction introuvable');
    }

    return {
      id: translation.id,
      frenchTerm: translation.frenchTerm,
      bheteTerm: translation.bheteTerm,
      toneNotation: translation.toneNotation,
      direction: translation.direction,
      contextOrMeaning: translation.contextOrMeaning,
      region: translation.region
        ? { id: translation.region.id, name: translation.region.name, code: translation.region.code }
        : null,
      canton: translation.canton
        ? { id: translation.canton.id, name: translation.canton.name, code: translation.canton.code }
        : null,
    };
  }
}
