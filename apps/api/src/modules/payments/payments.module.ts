import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AsaasProvider } from './providers/asaas.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, AsaasProvider],
  exports: [PaymentsService]
})
export class PaymentsModule {}
