import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePsychologistApprovalDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
