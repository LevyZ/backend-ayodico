import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TranslationsService } from './translations.service';
import { ListTranslationsDto } from './dto/list-translations.dto';

@SkipThrottle()
@Controller('translations')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get()
  findAll(@Query() query: ListTranslationsDto) {
    return this.translationsService.findAll(query);
  }
}
