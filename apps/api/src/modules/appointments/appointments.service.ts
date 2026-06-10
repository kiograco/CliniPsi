import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  Appointment,
  AppointmentModality,
  AppointmentStatus,
  Prisma,
  PsychologistApprovalStatus,
  UserRole
} from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { dateAtMinute, rangesOverlap } from '../schedule/utils/time.util';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

const appointmentInclude = {
  psychologist: {
    select: {
      id: true,
      professionalName: true,
      slug: true
    }
  },
  patient: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
} satisfies Prisma.AppointmentInclude;

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateAppointmentDto) {
    if (user.role !== UserRole.PATIENT) {
      throw new ForbiddenException('Apenas pacientes podem agendar consulta.');
    }

    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Horario da consulta invalido.');
    }

    const psychologist = await this.prisma.psychologistProfile.findFirst({
      where: {
        id: dto.psychologistId,
        approvalStatus: PsychologistApprovalStatus.APPROVED
      }
    });

    if (!psychologist) {
      throw new NotFoundException('Psicologo nao encontrado.');
    }

    if (psychologist.userId === user.id) {
      throw new BadRequestException('Psicologo nao pode agendar consigo mesmo.');
    }

    this.validateModality(psychologist, dto.modality);

    const endAt = new Date(
      startAt.getTime() + psychologist.consultationDurationMinutes * 60_000
    );

    await this.ensureSlotIsAvailable(psychologist.id, startAt, endAt);

    const appointment = await this.prisma.appointment.create({
      data: {
        psychologistId: psychologist.id,
        patientId: user.id,
        startAt,
        endAt,
        modality: dto.modality,
        status: AppointmentStatus.PENDING
      },
      include: appointmentInclude
    });

    return this.toAppointmentResponse(appointment);
  }

  async listPatientAppointments(user: AuthenticatedUser) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        patientId: user.id
      },
      include: appointmentInclude,
      orderBy: {
        startAt: 'desc'
      }
    });

    return appointments.map((appointment) =>
      this.toAppointmentResponse(appointment)
    );
  }

  async listPsychologistAppointments(user: AuthenticatedUser) {
    const profile = await this.getOwnedPsychologistProfile(user);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        psychologistId: profile.id
      },
      include: appointmentInclude,
      orderBy: {
        startAt: 'desc'
      }
    });

    return appointments.map((appointment) =>
      this.toAppointmentResponse(appointment)
    );
  }

  async updateStatus(
    user: AuthenticatedUser,
    appointmentId: string,
    dto: UpdateAppointmentStatusDto
  ) {
    if (dto.status === AppointmentStatus.CANCELED) {
      throw new BadRequestException('Use a rota de cancelamento.');
    }

    const appointment = await this.getAppointmentForActor(user, appointmentId);

    if (appointment.status === AppointmentStatus.CANCELED) {
      throw new BadRequestException('Consulta cancelada nao pode ser alterada.');
    }

    const updated = await this.prisma.appointment.update({
      where: {
        id: appointment.id
      },
      data: {
        status: dto.status
      },
      include: appointmentInclude
    });

    return this.toAppointmentResponse(updated);
  }

  async cancel(
    user: AuthenticatedUser,
    appointmentId: string,
    dto: CancelAppointmentDto
  ) {
    const appointment = await this.getAppointmentForActor(user, appointmentId);

    if (appointment.status === AppointmentStatus.CANCELED) {
      throw new BadRequestException('Consulta ja cancelada.');
    }

    const canceled = await this.prisma.appointment.update({
      where: {
        id: appointment.id
      },
      data: {
        status: AppointmentStatus.CANCELED,
        canceledAt: new Date(),
        canceledById: user.id,
        cancellationReason: dto.reason?.trim()
      },
      include: appointmentInclude
    });

    return this.toAppointmentResponse(canceled);
  }

  private validateModality(
    psychologist: {
      offersOnline: boolean;
      offersInPerson: boolean;
    },
    modality: AppointmentModality
  ) {
    if (modality === AppointmentModality.ONLINE && !psychologist.offersOnline) {
      throw new BadRequestException('Psicologo nao atende online.');
    }

    if (
      modality === AppointmentModality.IN_PERSON &&
      !psychologist.offersInPerson
    ) {
      throw new BadRequestException('Psicologo nao atende presencialmente.');
    }
  }

  private async ensureSlotIsAvailable(
    psychologistId: string,
    startAt: Date,
    endAt: Date
  ) {
    const dayStart = new Date(startAt);
    dayStart.setHours(0, 0, 0, 0);
    const startMinute = startAt.getHours() * 60 + startAt.getMinutes();
    const endMinute = endAt.getHours() * 60 + endAt.getMinutes();

    const [availability, block, conflict] = await Promise.all([
      this.prisma.availability.findFirst({
        where: {
          psychologistId,
          weekday: startAt.getDay(),
          active: true,
          startMinute: {
            lte: startMinute
          },
          endMinute: {
            gte: endMinute
          }
        }
      }),
      this.prisma.scheduleBlock.findFirst({
        where: {
          psychologistId,
          startAt: {
            lt: endAt
          },
          endAt: {
            gt: startAt
          }
        }
      }),
      this.prisma.appointment.findFirst({
        where: {
          psychologistId,
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
          },
          startAt: {
            lt: endAt
          },
          endAt: {
            gt: startAt
          }
        }
      })
    ]);

    if (!availability) {
      throw new BadRequestException('Horario fora da disponibilidade.');
    }

    if (block) {
      throw new BadRequestException('Horario bloqueado pelo psicologo.');
    }

    if (conflict) {
      throw new BadRequestException('Horario ja agendado.');
    }

    if (
      !rangesOverlap(
        startAt.getTime(),
        endAt.getTime(),
        dateAtMinute(dayStart, availability.startMinute).getTime(),
        dateAtMinute(dayStart, availability.endMinute).getTime()
      )
    ) {
      throw new BadRequestException('Horario fora da disponibilidade.');
    }
  }

  private async getOwnedPsychologistProfile(user: AuthenticatedUser) {
    if (user.role !== UserRole.PSYCHOLOGIST) {
      throw new ForbiddenException('Apenas psicologos podem acessar esta rota.');
    }

    const profile = await this.prisma.psychologistProfile.findUnique({
      where: {
        userId: user.id
      },
      select: {
        id: true
      }
    });

    if (!profile) {
      throw new NotFoundException('Perfil de psicologo nao encontrado.');
    }

    return profile;
  }

  private async getAppointmentForActor(
    user: AuthenticatedUser,
    appointmentId: string
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: {
        id: appointmentId
      },
      include: {
        psychologist: {
          select: {
            id: true,
            userId: true,
            professionalName: true,
            slug: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!appointment) {
      throw new NotFoundException('Consulta nao encontrada.');
    }

    const canAccess =
      user.role === UserRole.ADMIN ||
      appointment.patientId === user.id ||
      appointment.psychologist.userId === user.id;

    if (!canAccess) {
      throw new ForbiddenException('Consulta nao pertence ao usuario.');
    }

    return appointment;
  }

  private toAppointmentResponse(
    appointment: Appointment & {
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
    }
  ) {
    return {
      id: appointment.id,
      psychologistId: appointment.psychologistId,
      patientId: appointment.patientId,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      modality: appointment.modality,
      cancellationReason: appointment.cancellationReason,
      canceledAt: appointment.canceledAt,
      psychologist: appointment.psychologist,
      patient: appointment.patient
    };
  }
}
