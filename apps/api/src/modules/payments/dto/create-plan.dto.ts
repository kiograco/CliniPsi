import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsNumber({
    maxDecimalPlaces: 2
  })
  @Min(1)
  @Max(100000)
  price!: number;

  @IsNumber()
  @Min(1)
  @Max(3660)
  durationDays!: number;

  @IsOptional()
  @IsBoolean()
  active = true;
}
