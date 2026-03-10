import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TranslationsService } from './translations.service';
import { ListTranslationsDto } from './dto/list-translations.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@SkipThrottle()
@Controller('translations')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get()
  findAll(@Query() query: ListTranslationsDto) {
    return this.translationsService.findAll(query);
  }

  @Get('mine')
  @UseGuards(JwtAccessGuard)
  findMine(@Req() req: AuthenticatedRequest) {
    return this.translationsService.findMine(req.user!.userId);
  }

  @Get('pending')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findPending() {
    return this.translationsService.findPending();
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

  @Patch(':id')
  @UseGuards(JwtAccessGuard)
  requestUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateContributionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.translationsService.requestUpdate(req.user!.userId, id, dto);
  }
}
