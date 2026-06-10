import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NOTIFICATIONS_QUEUE } from './constants/notification-queue.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get<string>('REDIS_PORT', '6379'))
        }
      })
    }),
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE
    })
  ],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService]
})
export class NotificationsModule {}
