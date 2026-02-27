import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tone.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, displaySymbol: true },
    });
  }
}
