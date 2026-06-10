import { BadRequestException } from '@nestjs/common';
import {
  AppointmentModality,
  AppointmentStatus,
  ReviewModerationStatus,
  UserRole,
  UserStatus
} from '@prisma/client';
import { ReviewsService } from '../../src/modules/reviews/reviews.service';

const patient = {
  id: '2d53a790-9d15-4b78-a69e-cfe5d82626ca',
  email: 'paciente@example.com',
  role: UserRole.PATIENT,
  status: UserStatus.ACTIVE
};

const appointment = {
  id: '5fd6b513-f1a5-46cf-bc0b-8b159c475cd1',
  psychologistId: '4d03d371-79cc-4146-bdcb-4d9495496f33',
  patientId: patient.id,
  startAt: new Date(),
  endAt: new Date(),
  status: AppointmentStatus.COMPLETED,
  modality: AppointmentModality.ONLINE,
  cancellationReason: null,
  canceledById: null,
  canceledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  review: null
};

function review(overrides = {}) {
  return {
    id: 'review-id',
    appointmentId: appointment.id,
    psychologistId: appointment.psychologistId,
    patientId: patient.id,
    rating: 5,
    comment: 'Atendimento excelente.',
    moderationStatus: ReviewModerationStatus.PENDING,
    moderatedAt: null,
    moderatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: {
      id: patient.id,
      name: 'Paciente Teste'
    },
    psychologist: {
      id: appointment.psychologistId,
      professionalName: 'Dra Ana Silva',
      slug: 'dra-ana-silva'
    },
    appointment: {
      id: appointment.id,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: AppointmentStatus.COMPLETED
    },
    ...overrides
  };
}

function createService() {
  const prisma = {
    appointment: {
      findFirst: jest.fn()
    },
    review: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    }
  };

  return {
    service: new ReviewsService(prisma as never),
    prisma
  };
}

describe('ReviewsService', () => {
  it('cria avaliacao pendente apenas para consulta concluida', async () => {
    const { service, prisma } = createService();
    prisma.appointment.findFirst.mockResolvedValue(appointment);
    prisma.review.create.mockResolvedValue(review());

    const result = await service.create(patient, {
      appointmentId: appointment.id,
      rating: 5,
      comment: 'Atendimento excelente.'
    });

    expect(result.moderationStatus).toBe(ReviewModerationStatus.PENDING);
    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: patient.id,
          rating: 5
        })
      })
    );
  });

  it('rejeita avaliacao antes da consulta ser concluida', async () => {
    const { service, prisma } = createService();
    prisma.appointment.findFirst.mockResolvedValue({
      ...appointment,
      status: AppointmentStatus.CONFIRMED
    });

    await expect(
      service.create(patient, {
        appointmentId: appointment.id,
        rating: 5,
        comment: 'Atendimento excelente.'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita avaliacao duplicada', async () => {
    const { service, prisma } = createService();
    prisma.appointment.findFirst.mockResolvedValue({
      ...appointment,
      review: {
        id: 'existing-review'
      }
    });

    await expect(
      service.create(patient, {
        appointmentId: appointment.id,
        rating: 5,
        comment: 'Atendimento excelente.'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('modera avaliacao para aprovada', async () => {
    const { service, prisma } = createService();
    prisma.review.findUnique.mockResolvedValue({ id: 'review-id' });
    prisma.review.update.mockResolvedValue(
      review({
        moderationStatus: ReviewModerationStatus.APPROVED
      })
    );

    const result = await service.moderate(
      {
        id: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE
      },
      'review-id',
      {
        status: ReviewModerationStatus.APPROVED
      }
    );

    expect(result.moderationStatus).toBe(ReviewModerationStatus.APPROVED);
  });
});
