import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AppointmentsService } from './appointments.service';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(UserRole.PATIENT)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user, dto);
  }

  @Get('me')
  @Roles(UserRole.PATIENT)
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.listPatientAppointments(user);
  }

  @Get('psychologist')
  @Roles(UserRole.PSYCHOLOGIST)
  listPsychologist(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.listPsychologistAppointments(user);
  }

  @Patch(':id/status')
  @Roles(UserRole.PSYCHOLOGIST, UserRole.ADMIN)
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto
  ) {
    return this.appointmentsService.updateStatus(user, id, dto);
  }

  @Post(':id/cancel')
  @Roles(UserRole.PATIENT, UserRole.PSYCHOLOGIST, UserRole.ADMIN)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto
  ) {
    return this.appointmentsService.cancel(user, id, dto);
  }
}
