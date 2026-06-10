import { ReviewModerationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ModerateReviewDto {
  @IsEnum(ReviewModerationStatus)
  status!: ReviewModerationStatus;
}
