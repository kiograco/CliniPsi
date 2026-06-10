import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from './constants/notification-queue.constants';
import { NotificationJobPayload } from './types/notification-job.type';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<NotificationJobPayload>) {
    this.logger.log(`Notification job processed: ${job.name}`);

    return {
      processed: true
    };
  }
}
