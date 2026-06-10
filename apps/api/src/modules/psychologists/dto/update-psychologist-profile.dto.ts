import { PartialType } from '@nestjs/mapped-types';
import { CreatePsychologistProfileDto } from './create-psychologist-profile.dto';

export class UpdatePsychologistProfileDto extends PartialType(
  CreatePsychologistProfileDto
) {}
