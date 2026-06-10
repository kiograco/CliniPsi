import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AvailableSlotsQueryDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? 50 : Number(value)
  )
  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes = 50;
}
