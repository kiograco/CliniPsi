import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateScheduleBlockDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
