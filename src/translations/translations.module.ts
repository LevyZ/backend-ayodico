import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TranslationsController } from './translations.controller';
import { TranslationsService } from './translations.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TranslationsController],
  providers: [TranslationsService],
})
export class TranslationsModule {}
