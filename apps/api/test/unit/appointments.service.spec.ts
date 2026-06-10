import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AppointmentModality,
  AppointmentStatus,
  PsychologistApprovalStatus,
  UserRole,
  UserStatus
} from '@prisma/client';
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';

const patient = {
  id: '2d53a790-9d15-4b78-a69e-cfe5d82626ca',
  email: 'paciente@example.com',
  role: UserRole.PATIENT,
  status: UserStatus.ACTIVE
};

const psychologistProfile = {
  id: '4d03d371-79cc-4146-bdcb-4d9495496f33',
  userId: '84a49908-a72d-460e-b839-11eb70e06b36',
  professionalName: 'Dra Ana Silva',
  slug: 'dra-ana-silva',
  crp: 'CRP 06/123456',
  photoUrl: null,
  bio: 'Bio',
  consultationPrice: 180,
  consultationDurationMinutes: 50,
  offersOnline: true,
  offersInPerson: false,
  city: null,
  state: null,
  address: null,
  whatsapp: null,
  approvalStatus: PsychologistApprovalStatus.APPROVED,
  approvedAt: null,
  approvedById: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

function appointment(overrides = {}) {
  return {
    id: '5fd6b513-f1a5-46cf-bc0b-8b159c475cd1',
    psychologistId: psychologistProfile.id,
    patientId: patient.id,
    startAt: new Date('2026-06-15T09:00:00'),
    endAt: new Date('2026-06-15T09:50:00'),
    status: AppointmentStatus.PENDING,
    modality: AppointmentModality.ONLINE,
    cancellationReason: null,
    canceledById: null,
    canceledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    psychologist: {
      id: psychologistProfile.id,
      professionalName: psychologistProfile.professionalName,
      slug: psychologistProfile.slug
    },
    patient: {
      id: patient.id,
      name: 'Paciente Teste',
      email: patient.email
    },
    ...overrides
  };
}

function createService() {
  const prisma = {
    psychologistProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    availability: {
      findFirst: jest.fn()
    },
    scheduleBlock: {
      findFirst: jest.fn()
    },
    appointment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    }
  };

  return {
    service: new AppointmentsService(prisma as never),
    prisma
  };
}

describe('AppointmentsService', () => {
  it('cria consulta pendente em horario disponivel', async () => {
    const { service, prisma } = createService();
    prisma.psychologistProfile.findFirst.mockResolvedValue(psychologistProfile);
    prisma.availability.findFirst.mockResolvedValue({
      id: 'availability-id',
      startMinute: 540,
      endMinute: 720
    });
    prisma.scheduleBlock.findFirst.mockResolvedValue(null);
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.appointment.create.mockResolvedValue(appointment());

    const result = await service.create(patient, {
      psychologistId: psychologistProfile.id,
      startAt: '2026-06-15T09:00:00',
      modality: AppointmentModality.ONLINE
    });

    expect(result.status).toBe(AppointmentStatus.PENDING);
    expect(prisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: patient.id,
          psychologistId: psychologistProfile.id
        })
      })
    );
  });

  it('bloqueia criacao por usuario que nao e paciente', async () => {
    const { service } = createService();

    await expect(
      service.create(
        {
          ...patient,
          role: UserRole.PSYCHOLOGIST
        },
        {
          psychologistId: psychologistProfile.id,
          startAt: '2026-06-15T09:00:00',
          modality: AppointmentModality.ONLINE
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia conflito de horario', async () => {
    const { service, prisma } = createService();
    prisma.psychologistProfile.findFirst.mockResolvedValue(psychologistProfile);
    prisma.availability.findFirst.mockResolvedValue({
      id: 'availability-id',
      startMinute: 540,
      endMinute: 720
    });
    prisma.scheduleBlock.findFirst.mockResolvedValue(null);
    prisma.appointment.findFirst.mockResolvedValue({ id: 'conflict-id' });

    await expect(
      service.create(patient, {
        psychologistId: psychologistProfile.id,
        startAt: '2026-06-15T09:00:00',
        modality: AppointmentModality.ONLINE
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
