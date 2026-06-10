import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreatePsychologistProfileDto } from './dto/create-psychologist-profile.dto';
import { UpdatePsychologistProfileDto } from './dto/update-psychologist-profile.dto';
import { PsychologistsService } from './psychologists.service';

@Controller('psychologists')
export class PsychologistsController {
  constructor(private readonly psychologistsService: PsychologistsService) {}

  @Get(':slug/public')
  getPublicProfile(@Param('slug') slug: string) {
    return this.psychologistsService.getPublicProfileBySlug(slug);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePsychologistProfileDto
  ) {
    return this.psychologistsService.createProfile(user, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.psychologistsService.getMyProfile(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePsychologistProfileDto
  ) {
    return this.psychologistsService.updateMyProfile(user, dto);
  }
}
