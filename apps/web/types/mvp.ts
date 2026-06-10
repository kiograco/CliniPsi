import type { PublicTaxonomyItem } from './psychologist';

export type UserRole = 'ADMIN' | 'PSYCHOLOGIST' | 'PATIENT';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
};

export type AuthResponse = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = AuthResponse;

export type PsychologistProfile = {
  id: string;
  userId: string;
  professionalName: string;
  slug: string;
  crp: string;
  photoUrl: string | null;
  bio: string;
  consultationPrice: number;
  consultationDurationMinutes: number;
  offersOnline: boolean;
  offersInPerson: boolean;
  city: string | null;
  state: string | null;
  address?: string | null;
  whatsapp: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  specialties: PublicTaxonomyItem[];
  approaches: PublicTaxonomyItem[];
};

export type Availability = {
  id: string;
  psychologistId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELED'
  | 'COMPLETED';

export type AppointmentModality = 'ONLINE' | 'IN_PERSON';

export type Appointment = {
  id: string;
  psychologistId: string;
  patientId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  modality: AppointmentModality;
  cancellationReason: string | null;
  canceledAt: string | null;
  psychologist: {
    id: string;
    professionalName: string;
    slug: string;
  };
  patient: {
    id: string;
    name: string;
    email: string;
  };
};

export type AvailableSlotsResponse = {
  date: string;
  durationMinutes: number;
  slots: Array<{
    startAt: string;
    endAt: string;
  }>;
};
