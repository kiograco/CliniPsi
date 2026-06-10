import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  PsychologistApprovalStatus,
  UserRole,
  UserStatus
} from '@prisma/client';
import { ScheduleService } from '../../src/modules/schedule/schedule.service';

const psychologistUser = {
  id: '84a49908-a72d-460e-b839-11eb70e06b36',
  email: 'psi@example.com',
  role: UserRole.PSYCHOLOGIST,
  status: UserStatus.ACTIVE
};

const profile = {
  id: '4d03d371-79cc-4146-bdcb-4d9495496f33'
};

function createService() {
  const prisma = {
    psychologistProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn()
    },
    availability: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    scheduleBlock: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn()
    },
    appointment: {
      findMany: jest.fn()
    }
  };

  const paymentsService = {
    ensurePsychologistCanUseSaas: jest.fn()
  };

  return {
    service: new ScheduleService(prisma as never, paymentsService as never),
    prisma
  };
}

describe('ScheduleService', () => {
  it('cria disponibilidade sem sobreposicao', async () => {
    const { service, prisma } = createService();
    prisma.psychologistProfile.findUnique.mockResolvedValue(profile);
    prisma.availability.findFirst.mockResolvedValue(null);
    prisma.availability.create.mockResolvedValue({
      id: 'availability-id',
      psychologistId: profile.id,
      weekday: 1,
      startMinute: 540,
      endMinute: 720,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await service.createAvailability(psychologistUser, {
      weekday: 1,
      startTime: '09:00',
      endTime: '12:00',
      active: true
    });

    expect(prisma.availability.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startMinute: 540,
          endMinute: 720
        })
      })
    );
    expect(result.startTime).toBe('09:00');
  });

  it('bloqueia agenda para usuario que nao e psicologo', async () => {
    const { service } = createService();

    await expect(
      service.createAvailability(
        {
          ...psychologistUser,
          role: UserRole.PATIENT
        },
        {
          weekday: 1,
          startTime: '09:00',
          endTime: '12:00',
          active: true
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejeita disponibilidade sobreposta', async () => {
    const { service, prisma } = createService();
    prisma.psychologistProfile.findUnique.mockResolvedValue(profile);
    prisma.availability.findFirst.mockResolvedValue({
      id: 'existing'
    });

    await expect(
      service.createAvailability(psychologistUser, {
        weekday: 1,
        startTime: '09:00',
        endTime: '12:00',
        active: true
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('remove slots que conflitam com bloqueios', async () => {
    const { service, prisma } = createService();
    prisma.psychologistProfile.findFirst.mockResolvedValue({
      id: profile.id,
      approvalStatus: PsychologistApprovalStatus.APPROVED
    });
    prisma.availability.findMany.mockResolvedValue([
      {
        id: 'availability-id',
        psychologistId: profile.id,
        weekday: 1,
        startMinute: 540,
        endMinute: 660,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    prisma.scheduleBlock.findMany.mockResolvedValue([
      {
        id: 'block-id',
        psychologistId: profile.id,
        startAt: new Date('2026-06-15T10:00:00'),
        endAt: new Date('2026-06-15T11:00:00'),
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    prisma.appointment.findMany.mockResolvedValue([]);

    const result = await service.getAvailableSlots(profile.id, {
      date: '2026-06-15',
      durationMinutes: 60
    });

    expect(result.slots).toHaveLength(1);
  });
});
