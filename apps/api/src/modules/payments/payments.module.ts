import { Module } from '@nestjs/common';
import { AsaasProvider } from './providers/asaas.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, AsaasProvider],
  exports: [PaymentsService]
})
export class PaymentsModule {}
