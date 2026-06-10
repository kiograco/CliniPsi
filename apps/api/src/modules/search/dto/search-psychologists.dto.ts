import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min
} from 'class-validator';

export enum SearchModality {
  ONLINE = 'ONLINE',
  IN_PERSON = 'IN_PERSON'
}

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

export class SearchPsychologistsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsUUID('4')
  specialtyId?: string;

  @IsOptional()
  @IsString()
  specialtySlug?: string;

  @IsOptional()
  @IsUUID('4')
  approachId?: string;

  @IsOptional()
  @IsString()
  approachSlug?: string;

  @IsOptional()
  @IsEnum(SearchModality)
  modality?: SearchModality;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => toNumber(value) ?? 1)
  @IsNumber()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => toNumber(value) ?? 12)
  @IsNumber()
  @Min(1)
  @Max(50)
  perPage = 12;
}
