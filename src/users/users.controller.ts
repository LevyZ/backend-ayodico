import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-access.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAccessGuard)
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user!.userId);
  }

  @UseGuards(JwtAccessGuard)
  @Patch('me')
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updatePreferences(req.user!.userId, dto);
  }
}
