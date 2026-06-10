import { AppointmentModality } from '@prisma/client';
import { IsDateString, IsEnum, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID('4')
  psychologistId!: string;

  @IsDateString()
  startAt!: string;

  @IsEnum(AppointmentModality)
  modality!: AppointmentModality;
}
