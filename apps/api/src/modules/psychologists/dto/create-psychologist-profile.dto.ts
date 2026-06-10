import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength
} from 'class-validator';

export class CreatePsychologistProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  professionalName!: string;

  @IsString()
  @Matches(/^CRP\s?\d{2}\/\d{4,6}$/i, {
    message: 'CRP deve seguir o formato CRP 00/00000.'
  })
  crp!: string;

  @IsOptional()
  @IsUrl({
    require_tld: false
  })
  @MaxLength(500)
  photoUrl?: string;

  @IsString()
  @MinLength(80)
  @MaxLength(3000)
  bio!: string;

  @IsNumber({
    maxDecimalPlaces: 2
  })
  @Min(1)
  @Max(100000)
  consultationPrice!: number;

  @IsNumber()
  @Min(15)
  @Max(240)
  consultationDurationMinutes!: number;

  @IsBoolean()
  offersOnline!: boolean;

  @IsBoolean()
  offersInPerson!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', {
    each: true
  })
  specialtyIds!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', {
    each: true
  })
  approachIds!: string[];
}
