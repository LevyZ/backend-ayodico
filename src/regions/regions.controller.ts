import { Controller, Get, Param } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { RegionsService } from './regions.service';

@SkipThrottle()
@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  getRegions() {
    return this.regionsService.getRegions();
  }

  @Get(':id/cantons')
  getCantons(@Param('id') id: string) {
    return this.regionsService.getCantons(id);
  }
}
