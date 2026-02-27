import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TonesController } from './tones.controller';
import { TonesService } from './tones.service';

@Module({
  imports: [PrismaModule],
  controllers: [TonesController],
  providers: [TonesService],
})
export class TonesModule {}
