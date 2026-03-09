import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContributionAction, TranslationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ListTranslationsDto } from './dto/list-translations.dto';
import type { CreateContributionDto } from './dto/create-contribution.dto';

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

  async create(userId: string, dto: CreateContributionDto) {
    const { frenchTerm, bheteTerm, toneNotation, direction, contextOrMeaning, regionId, cantonId } = dto;

    if (regionId) {
      const region = await this.prisma.region.findUnique({ where: { id: regionId } });
      if (!region) throw new NotFoundException('Région introuvable');
    }

    if (cantonId && !regionId) {
      throw new BadRequestException('Un canton ne peut pas être spécifié sans une région');
    }

    if (cantonId) {
      const canton = await this.prisma.canton.findUnique({ where: { id: cantonId } });
      if (!canton) throw new NotFoundException('Canton introuvable');
      if (canton.regionId !== regionId)
        throw new BadRequestException('Le canton ne fait pas partie de la région indiquée');
    }

    const translation = await this.prisma.$transaction(async (tx) => {
      const t = await tx.translation.create({
        data: {
          frenchTerm,
          bheteTerm,
          toneNotation,
          direction,
          contextOrMeaning: contextOrMeaning ?? null,
          regionId: regionId ?? null,
          cantonId: cantonId ?? null,
          status: TranslationStatus.PENDING,
          contributorId: userId,
        },
      });

      await tx.contributionHistory.create({
        data: {
          translationId: t.id,
          userId,
          action: ContributionAction.CREATED,
        },
      });

      return t;
    });

    return {
      id: translation.id,
      frenchTerm: translation.frenchTerm,
      bheteTerm: translation.bheteTerm,
      toneNotation: translation.toneNotation,
      direction: translation.direction,
      status: translation.status,
      regionId: translation.regionId,
      cantonId: translation.cantonId,
      createdAt: translation.createdAt.toISOString(),
    };
  }

  async findMine(userId: string) {
    const translations = await this.prisma.translation.findMany({
      where: { contributorId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return translations.map((t) => ({
      id: t.id,
      frenchTerm: t.frenchTerm,
      bheteTerm: t.bheteTerm,
      toneNotation: t.toneNotation,
      direction: t.direction,
      status: t.status,
      regionId: t.regionId,
      cantonId: t.cantonId,
      createdAt: t.createdAt.toISOString(),
    }));
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
