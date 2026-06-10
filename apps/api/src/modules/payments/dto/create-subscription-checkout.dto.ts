import { IsUUID } from 'class-validator';

export class CreateSubscriptionCheckoutDto {
  @IsUUID('4')
  planId!: string;
}
