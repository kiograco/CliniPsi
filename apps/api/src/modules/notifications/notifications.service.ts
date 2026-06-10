import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  NotificationJobName,
  NOTIFICATIONS_QUEUE
} from './constants/notification-queue.constants';
import { NotificationJobPayload } from './types/notification-job.type';

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue<NotificationJobPayload>
  ) {}

  enqueueRegistrationConfirmation(userId: string) {
    return this.enqueue({
      name: NotificationJobName.REGISTRATION_CONFIRMATION,
      userId
    });
  }

  enqueueAppointmentCreated(appointmentId: string) {
    return this.enqueue({
      name: NotificationJobName.APPOINTMENT_CREATED,
      appointmentId
    });
  }

  enqueueAppointmentReminder(appointmentId: string, startAt: Date) {
    const delay = startAt.getTime() - Date.now() - ONE_DAY_IN_MS;

    return this.enqueue(
      {
        name: NotificationJobName.APPOINTMENT_REMINDER,
        appointmentId
      },
      Math.max(delay, 0)
    );
  }

  enqueuePaymentApproved(paymentId: string) {
    return this.enqueue({
      name: NotificationJobName.PAYMENT_APPROVED,
      paymentId
    });
  }

  enqueueAppointmentCanceled(appointmentId: string) {
    return this.enqueue({
      name: NotificationJobName.APPOINTMENT_CANCELED,
      appointmentId
    });
  }

  private async enqueue(payload: NotificationJobPayload, delay = 0) {
    try {
      await this.notificationsQueue.add(payload.name, payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        delay,
        removeOnComplete: 1000,
        removeOnFail: 5000
      });
    } catch {
      this.logger.warn(`Notification job enqueue failed: ${payload.name}`);
    }
  }
}
