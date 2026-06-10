import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PsychologistApprovalStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSlug } from '../psychologists/utils/slug.util';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdatePsychologistApprovalDto } from './dto/update-psychologist-approval.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

const adminProfileInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true
    }
  },
  specialties: {
    include: {
      specialty: true
    }
  },
  approaches: {
    include: {
      approach: true
    }
  }
} satisfies Prisma.PsychologistProfileInclude;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return users.map(({ passwordHash: _passwordHash, ...user }) => user);
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        status: dto.status
      }
    });

    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }

  async listPendingPsychologists() {
    const profiles = await this.prisma.psychologistProfile.findMany({
      where: {
        approvalStatus: PsychologistApprovalStatus.PENDING
      },
      include: adminProfileInclude,
      orderBy: {
        createdAt: 'asc'
      }
    });

    return profiles.map((profile) => this.toAdminProfile(profile));
  }

  async approvePsychologist(admin: AuthenticatedUser, psychologistId: string) {
    await this.ensureProfileExists(psychologistId);

    const profile = await this.prisma.psychologistProfile.update({
      where: {
        id: psychologistId
      },
      data: {
        approvalStatus: PsychologistApprovalStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: admin.id
      },
      include: adminProfileInclude
    });

    return this.toAdminProfile(profile);
  }

  async rejectPsychologist(
    admin: AuthenticatedUser,
    psychologistId: string,
    _dto: UpdatePsychologistApprovalDto
  ) {
    await this.ensureProfileExists(psychologistId);

    const profile = await this.prisma.psychologistProfile.update({
      where: {
        id: psychologistId
      },
      data: {
        approvalStatus: PsychologistApprovalStatus.REJECTED,
        approvedAt: null,
        approvedById: admin.id
      },
      include: adminProfileInclude
    });

    return this.toAdminProfile(profile);
  }

  async listAppointments() {
    return this.prisma.appointment.findMany({
      include: {
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
      },
      orderBy: {
        startAt: 'desc'
      }
    });
  }

  createSpecialty(dto: CreateTaxonomyDto) {
    return this.prisma.specialty.create({
      data: {
        name: dto.name.trim(),
        slug: buildSlug(dto.name),
        active: dto.active
      }
    });
  }

  updateSpecialty(id: string, dto: UpdateTaxonomyDto) {
    return this.prisma.specialty.update({
      where: {
        id
      },
      data: {
        name: dto.name?.trim(),
        slug: dto.name ? buildSlug(dto.name) : undefined,
        active: dto.active
      }
    });
  }

  createApproach(dto: CreateTaxonomyDto) {
    return this.prisma.approach.create({
      data: {
        name: dto.name.trim(),
        slug: buildSlug(dto.name),
        active: dto.active
      }
    });
  }

  updateApproach(id: string, dto: UpdateTaxonomyDto) {
    return this.prisma.approach.update({
      where: {
        id
      },
      data: {
        name: dto.name?.trim(),
        slug: dto.name ? buildSlug(dto.name) : undefined,
        active: dto.active
      }
    });
  }

  private async ensureProfileExists(psychologistId: string) {
    const profile = await this.prisma.psychologistProfile.findUnique({
      where: {
        id: psychologistId
      },
      select: {
        id: true
      }
    });

    if (!profile) {
      throw new NotFoundException('Perfil de psicologo nao encontrado.');
    }
  }

  private toAdminProfile(
    profile: Prisma.PsychologistProfileGetPayload<{
      include: typeof adminProfileInclude;
    }>
  ) {
    return {
      id: profile.id,
      userId: profile.userId,
      professionalName: profile.professionalName,
      slug: profile.slug,
      crp: profile.crp,
      photoUrl: profile.photoUrl,
      bio: profile.bio,
      consultationPrice: profile.consultationPrice.toNumber(),
      consultationDurationMinutes: profile.consultationDurationMinutes,
      offersOnline: profile.offersOnline,
      offersInPerson: profile.offersInPerson,
      city: profile.city,
      state: profile.state,
      approvalStatus: profile.approvalStatus,
      approvedAt: profile.approvedAt,
      user: profile.user,
      specialties: profile.specialties.map(({ specialty }) => specialty),
      approaches: profile.approaches.map(({ approach }) => approach)
    };
  }
}
