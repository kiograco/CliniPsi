import { IsUUID } from 'class-validator';

export class CreateAppointmentPaymentDto {
  @IsUUID('4')
  appointmentId!: string;
}
