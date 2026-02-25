import { Injectable } from '@nestjs/common';
import { TranslationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ListTranslationsDto } from './dto/list-translations.dto';

@Injectable()
export class TranslationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: ListTranslationsDto) {
    const { direction, page = 1, limit = 20, regionId, cantonId } = dto;
    const where = {
      status: TranslationStatus.APPROVED,
      ...(direction ? { direction } : {}),
      ...(regionId ? { regionId } : {}),
      ...(cantonId ? { cantonId } : {}),
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
}
