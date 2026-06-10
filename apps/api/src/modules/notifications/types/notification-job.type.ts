import { NotificationJobName } from '../constants/notification-queue.constants';

export type NotificationJobPayload =
  | {
      name: NotificationJobName.REGISTRATION_CONFIRMATION;
      userId: string;
    }
  | {
      name: NotificationJobName.APPOINTMENT_CREATED;
      appointmentId: string;
    }
  | {
      name: NotificationJobName.APPOINTMENT_REMINDER;
      appointmentId: string;
    }
  | {
      name: NotificationJobName.PAYMENT_APPROVED;
      paymentId: string;
    }
  | {
      name: NotificationJobName.APPOINTMENT_CANCELED;
      appointmentId: string;
    };
