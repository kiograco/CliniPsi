import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  Appointment,
  AppointmentStatus,
  Availability,
  PsychologistApprovalStatus,
  ScheduleBlock,
  UserRole
} from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import {
  dateAtMinute,
  minuteToTime,
  rangesOverlap,
  timeToMinute
} from './utils/time.util';

type AvailabilityInput = {
  weekday?: number;
  startTime?: string;
  endTime?: string;
  active?: boolean;
};

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async createAvailability(
    user: AuthenticatedUser,
    dto: CreateAvailabilityDto
  ) {
    const profile = await this.getOwnedProfile(user);
    const startMinute = timeToMinute(dto.startTime);
    const endMinute = timeToMinute(dto.endTime);
    this.validateAvailabilityRange(startMinute, endMinute);

    await this.ensureNoAvailabilityOverlap(
      profile.id,
      dto.weekday,
      startMinute,
      endMinute
    );

    const availability = await this.prisma.availability.create({
      data: {
        psychologistId: profile.id,
        weekday: dto.weekday,
        startMinute,
        endMinute,
        active: dto.active
      }
    });

    return this.toAvailabilityResponse(availability);
  }

  async listMyAvailability(user: AuthenticatedUser) {
    const profile = await this.getOwnedProfile(user);
    const availabilities = await this.prisma.availability.findMany({
      where: {
        psychologistId: profile.id
      },
      orderBy: [
        {
          weekday: 'asc'
        },
        {
          startMinute: 'asc'
        }
      ]
    });

    return availabilities.map((availability) =>
      this.toAvailabilityResponse(availability)
    );
  }

  async updateAvailability(
    user: AuthenticatedUser,
    availabilityId: string,
    dto: UpdateAvailabilityDto
  ) {
    const profile = await this.getOwnedProfile(user);
    const current = await this.getOwnedAvailability(profile.id, availabilityId);
    const merged = this.mergeAvailabilityInput(current, dto);

    this.validateAvailabilityRange(merged.startMinute, merged.endMinute);

    await this.ensureNoAvailabilityOverlap(
      profile.id,
      merged.weekday,
      merged.startMinute,
      merged.endMinute,
      current.id
    );

    const availability = await this.prisma.availability.update({
      where: {
        id: current.id
      },
      data: {
        weekday: merged.weekday,
        startMinute: merged.startMinute,
        endMinute: merged.endMinute,
        active: merged.active
      }
    });

    return this.toAvailabilityResponse(availability);
  }

  async deleteAvailability(user: AuthenticatedUser, availabilityId: string) {
    const profile = await this.getOwnedProfile(user);
    const availability = await this.getOwnedAvailability(
      profile.id,
      availabilityId
    );

    await this.prisma.availability.delete({
      where: {
        id: availability.id
      }
    });

    return {
      success: true
    };
  }

  async createBlock(user: AuthenticatedUser, dto: CreateScheduleBlockDto) {
    const profile = await this.getOwnedProfile(user);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Datas do bloqueio sao invalidas.');
    }

    if (startAt >= endAt) {
      throw new BadRequestException('Inicio deve ser anterior ao fim.');
    }

    await this.ensureNoBlockOverlap(profile.id, startAt, endAt);

    const block = await this.prisma.scheduleBlock.create({
      data: {
        psychologistId: profile.id,
        startAt,
        endAt,
        reason: dto.reason?.trim()
      }
    });

    return this.toBlockResponse(block);
  }

  async listMyBlocks(user: AuthenticatedUser) {
    const profile = await this.getOwnedProfile(user);
    const blocks = await this.prisma.scheduleBlock.findMany({
      where: {
        psychologistId: profile.id
      },
      orderBy: {
        startAt: 'asc'
      }
    });

    return blocks.map((block) => this.toBlockResponse(block));
  }

  async deleteBlock(user: AuthenticatedUser, blockId: string) {
    const profile = await this.getOwnedProfile(user);
    const block = await this.prisma.scheduleBlock.findFirst({
      where: {
        id: blockId,
        psychologistId: profile.id
      }
    });

    if (!block) {
      throw new NotFoundException('Bloqueio nao encontrado.');
    }

    await this.prisma.scheduleBlock.delete({
      where: {
        id: block.id
      }
    });

    return {
      success: true
    };
  }

  async getAvailableSlots(
    psychologistId: string,
    query: AvailableSlotsQueryDto
  ) {
    const date = new Date(`${query.date}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Data invalida.');
    }

    const profile = await this.prisma.psychologistProfile.findFirst({
      where: {
        id: psychologistId,
        approvalStatus: PsychologistApprovalStatus.APPROVED
      },
      select: {
        id: true
      }
    });

    if (!profile) {
      throw new NotFoundException('Psicologo nao encontrado.');
    }

    const weekday = date.getDay();
    const [availabilities, blocks, appointments] = await Promise.all([
      this.prisma.availability.findMany({
        where: {
          psychologistId,
          weekday,
          active: true
        },
        orderBy: {
          startMinute: 'asc'
        }
      }),
      this.prisma.scheduleBlock.findMany({
        where: {
          psychologistId,
          startAt: {
            lt: this.endOfDay(date)
          },
          endAt: {
            gt: date
          }
        }
      }),
      this.prisma.appointment.findMany({
        where: {
          psychologistId,
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
          },
          startAt: {
            lt: this.endOfDay(date)
          },
          endAt: {
            gt: date
          }
        }
      })
    ]);

    const slots = availabilities.flatMap((availability) =>
      this.buildSlotsForAvailability(
        date,
        availability,
        blocks,
        appointments,
        query.durationMinutes
      )
    );

    return {
      date: query.date,
      durationMinutes: query.durationMinutes,
      slots
    };
  }

  private async getOwnedProfile(user: AuthenticatedUser) {
    if (user.role !== UserRole.PSYCHOLOGIST) {
      throw new ForbiddenException('Apenas psicologos podem gerenciar agenda.');
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

  private async getOwnedAvailability(
    psychologistId: string,
    availabilityId: string
  ) {
    const availability = await this.prisma.availability.findFirst({
      where: {
        id: availabilityId,
        psychologistId
      }
    });

    if (!availability) {
      throw new NotFoundException('Disponibilidade nao encontrada.');
    }

    return availability;
  }

  private validateAvailabilityRange(startMinute: number, endMinute: number) {
    if (startMinute >= endMinute) {
      throw new BadRequestException('Horario inicial deve ser anterior ao final.');
    }
  }

  private async ensureNoAvailabilityOverlap(
    psychologistId: string,
    weekday: number,
    startMinute: number,
    endMinute: number,
    currentId?: string
  ) {
    const overlapping = await this.prisma.availability.findFirst({
      where: {
        psychologistId,
        weekday,
        id: currentId
          ? {
              not: currentId
            }
          : undefined,
        active: true,
        startMinute: {
          lt: endMinute
        },
        endMinute: {
          gt: startMinute
        }
      }
    });

    if (overlapping) {
      throw new BadRequestException('Disponibilidade sobrepoe outro horario.');
    }
  }

  private async ensureNoBlockOverlap(
    psychologistId: string,
    startAt: Date,
    endAt: Date
  ) {
    const overlapping = await this.prisma.scheduleBlock.findFirst({
      where: {
        psychologistId,
        startAt: {
          lt: endAt
        },
        endAt: {
          gt: startAt
        }
      }
    });

    if (overlapping) {
      throw new BadRequestException('Bloqueio sobrepoe outro bloqueio.');
    }
  }

  private mergeAvailabilityInput(
    current: Availability,
    dto: AvailabilityInput
  ) {
    return {
      weekday: dto.weekday ?? current.weekday,
      startMinute: dto.startTime ? timeToMinute(dto.startTime) : current.startMinute,
      endMinute: dto.endTime ? timeToMinute(dto.endTime) : current.endMinute,
      active: dto.active ?? current.active
    };
  }

  private buildSlotsForAvailability(
    date: Date,
    availability: Availability,
    blocks: ScheduleBlock[],
    appointments: Appointment[],
    durationMinutes: number
  ) {
    const slots: Array<{ startAt: string; endAt: string }> = [];

    for (
      let startMinute = availability.startMinute;
      startMinute + durationMinutes <= availability.endMinute;
      startMinute += durationMinutes
    ) {
      const endMinute = startMinute + durationMinutes;
      const startAt = dateAtMinute(date, startMinute);
      const endAt = dateAtMinute(date, endMinute);
      const blocked = blocks.some((block) =>
        rangesOverlap(
          startAt.getTime(),
          endAt.getTime(),
          block.startAt.getTime(),
          block.endAt.getTime()
        )
      );
      const occupied = appointments.some((appointment) =>
        rangesOverlap(
          startAt.getTime(),
          endAt.getTime(),
          appointment.startAt.getTime(),
          appointment.endAt.getTime()
        )
      );

      if (!blocked && !occupied) {
        slots.push({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString()
        });
      }
    }

    return slots;
  }

  private endOfDay(date: Date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  private toAvailabilityResponse(availability: Availability) {
    return {
      id: availability.id,
      psychologistId: availability.psychologistId,
      weekday: availability.weekday,
      startTime: minuteToTime(availability.startMinute),
      endTime: minuteToTime(availability.endMinute),
      active: availability.active
    };
  }

  private toBlockResponse(block: ScheduleBlock) {
    return {
      id: block.id,
      psychologistId: block.psychologistId,
      startAt: block.startAt,
      endAt: block.endAt,
      reason: block.reason
    };
  }
}
