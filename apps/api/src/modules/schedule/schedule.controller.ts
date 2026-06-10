import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  createAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAvailabilityDto
  ) {
    return this.scheduleService.createAvailability(user, dto);
  }

  @Get('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  listMyAvailability(@CurrentUser() user: AuthenticatedUser) {
    return this.scheduleService.listMyAvailability(user);
  }

  @Patch('availability/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  updateAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto
  ) {
    return this.scheduleService.updateAvailability(user, id, dto);
  }

  @Delete('availability/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  deleteAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return this.scheduleService.deleteAvailability(user, id);
  }

  @Post('blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  createBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScheduleBlockDto
  ) {
    return this.scheduleService.createBlock(user, dto);
  }

  @Get('blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  listMyBlocks(@CurrentUser() user: AuthenticatedUser) {
    return this.scheduleService.listMyBlocks(user);
  }

  @Delete('blocks/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  deleteBlock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.scheduleService.deleteBlock(user, id);
  }

  @Get('psychologists/:id/available-slots')
  getAvailableSlots(
    @Param('id') psychologistId: string,
    @Query() query: AvailableSlotsQueryDto
  ) {
    return this.scheduleService.getAvailableSlots(psychologistId, query);
  }
}
