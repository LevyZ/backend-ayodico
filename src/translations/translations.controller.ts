import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TranslationsService } from './translations.service';
import { ListTranslationsDto } from './dto/list-translations.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-access.guard';

@SkipThrottle()
@Controller('translations')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get()
  findAll(@Query() query: ListTranslationsDto) {
    return this.translationsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.translationsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateContributionDto, @Req() req: AuthenticatedRequest) {
    return this.translationsService.create(req.user!.userId, dto);
  }
}
