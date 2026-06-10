export const NOTIFICATIONS_QUEUE = 'notifications';

export enum NotificationJobName {
  REGISTRATION_CONFIRMATION = 'registration.confirmation',
  APPOINTMENT_CREATED = 'appointment.created',
  APPOINTMENT_REMINDER = 'appointment.reminder',
  PAYMENT_APPROVED = 'payment.approved',
  APPOINTMENT_CANCELED = 'appointment.canceled'
}
