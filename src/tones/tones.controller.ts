import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TonesService } from './tones.service';

@SkipThrottle()
@Controller('tones')
export class TonesController {
  constructor(private readonly tonesService: TonesService) {}

  @Get()
  findAll() {
    return this.tonesService.findAll();
  }
}
