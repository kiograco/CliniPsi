import { IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @Length(96, 96)
  refreshToken!: string;
}
