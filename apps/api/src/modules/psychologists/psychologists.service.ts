import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  Prisma,
  PsychologistApprovalStatus,
  ReviewModerationStatus,
  SubscriptionStatus,
  UserRole
} from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePsychologistProfileDto } from './dto/create-psychologist-profile.dto';
import { UpdatePsychologistProfileDto } from './dto/update-psychologist-profile.dto';
import { buildSlug } from './utils/slug.util';

const profileInclude = {
  specialties: {
    include: {
      specialty: true
    }
  },
  approaches: {
    include: {
      approach: true
    }
  },
  reviews: {
    where: {
      moderationStatus: ReviewModerationStatus.APPROVED
    },
    include: {
      patient: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  }
} satisfies Prisma.PsychologistProfileInclude;

@Injectable()
export class PsychologistsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(
    user: AuthenticatedUser,
    dto: CreatePsychologistProfileDto
  ) {
    this.ensurePsychologist(user);
    this.validateProfileRules(dto);

    const existingProfile = await this.prisma.psychologistProfile.findUnique({
      where: {
        userId: user.id
      }
    });

    if (existingProfile) {
      throw new BadRequestException('Psicologo ja possui perfil cadastrado.');
    }

    await this.ensureRelatedEntitiesAreActive(
      dto.specialtyIds,
      dto.approachIds
    );

    const slug = await this.buildUniqueSlug(dto.professionalName);

    const profile = await this.prisma.psychologistProfile.create({
      data: {
        userId: user.id,
        professionalName: dto.professionalName.trim(),
        slug,
        crp: dto.crp.trim().toUpperCase(),
        photoUrl: dto.photoUrl?.trim(),
        bio: dto.bio.trim(),
        consultationPrice: new Prisma.Decimal(dto.consultationPrice),
        consultationDurationMinutes: dto.consultationDurationMinutes,
        offersOnline: dto.offersOnline,
        offersInPerson: dto.offersInPerson,
        city: dto.city?.trim(),
        state: dto.state?.trim().toUpperCase(),
        address: dto.address?.trim(),
        whatsapp: dto.whatsapp?.trim(),
        approvalStatus: PsychologistApprovalStatus.PENDING,
        specialties: {
          create: dto.specialtyIds.map((specialtyId) => ({
            specialty: {
              connect: {
                id: specialtyId
              }
            }
          }))
        },
        approaches: {
          create: dto.approachIds.map((approachId) => ({
            approach: {
              connect: {
                id: approachId
              }
            }
          }))
        }
      },
      include: profileInclude
    });

    return this.toProfileResponse(profile);
  }

  async getMyProfile(user: AuthenticatedUser) {
    this.ensurePsychologist(user);

    const profile = await this.prisma.psychologistProfile.findUnique({
      where: {
        userId: user.id
      },
      include: profileInclude
    });

    if (!profile) {
      throw new NotFoundException('Perfil de psicologo nao encontrado.');
    }

    return this.toProfileResponse(profile);
  }

  async getPublicProfileBySlug(slug: string) {
    const profile = await this.prisma.psychologistProfile.findUnique({
      where: {
        slug,
        OR: [
          {
            subscriptions: {
              none: {}
            }
          },
          {
            subscriptions: {
              some: {
                status: SubscriptionStatus.ACTIVE,
                endsAt: {
                  gt: new Date()
                }
              }
            }
          }
        ]
      },
      include: profileInclude
    });

    if (
      !profile ||
      profile.approvalStatus !== PsychologistApprovalStatus.APPROVED
    ) {
      throw new NotFoundException('Perfil publico nao encontrado.');
    }

    return this.toPublicProfileResponse(profile);
  }

  async updateMyProfile(
    user: AuthenticatedUser,
    dto: UpdatePsychologistProfileDto
  ) {
    this.ensurePsychologist(user);
    this.validateProfileRules(dto);

    const existingProfile = await this.prisma.psychologistProfile.findUnique({
      where: {
        userId: user.id
      }
    });

    if (!existingProfile) {
      throw new NotFoundException('Perfil de psicologo nao encontrado.');
    }

    if (dto.specialtyIds || dto.approachIds) {
      await this.ensureRelatedEntitiesAreActive(
        dto.specialtyIds ?? [],
        dto.approachIds ?? []
      );
    }

    const data: Prisma.PsychologistProfileUpdateInput = {
      professionalName: dto.professionalName?.trim(),
      crp: dto.crp?.trim().toUpperCase(),
      photoUrl: dto.photoUrl?.trim(),
      bio: dto.bio?.trim(),
      consultationPrice:
        dto.consultationPrice === undefined
          ? undefined
          : new Prisma.Decimal(dto.consultationPrice),
      consultationDurationMinutes: dto.consultationDurationMinutes,
      offersOnline: dto.offersOnline,
      offersInPerson: dto.offersInPerson,
      city: dto.city?.trim(),
      state: dto.state?.trim().toUpperCase(),
      address: dto.address?.trim(),
      whatsapp: dto.whatsapp?.trim(),
      approvalStatus: PsychologistApprovalStatus.PENDING,
      approvedAt: null,
      approvedBy: {
        disconnect: true
      }
    };

    if (dto.professionalName) {
      data.slug = await this.buildUniqueSlug(
        dto.professionalName,
        existingProfile.id
      );
    }

    if (dto.specialtyIds) {
      data.specialties = {
        deleteMany: {},
        create: dto.specialtyIds.map((specialtyId) => ({
          specialty: {
            connect: {
              id: specialtyId
            }
          }
        }))
      };
    }

    if (dto.approachIds) {
      data.approaches = {
        deleteMany: {},
        create: dto.approachIds.map((approachId) => ({
          approach: {
            connect: {
              id: approachId
            }
          }
        }))
      };
    }

    const profile = await this.prisma.psychologistProfile.update({
      where: {
        id: existingProfile.id
      },
      data,
      include: profileInclude
    });

    return this.toProfileResponse(profile);
  }

  private ensurePsychologist(user: AuthenticatedUser) {
    if (user.role !== UserRole.PSYCHOLOGIST) {
      throw new ForbiddenException('Apenas psicologos podem gerenciar perfil.');
    }
  }

  private validateProfileRules(
    dto: CreatePsychologistProfileDto | UpdatePsychologistProfileDto
  ) {
    if (dto.offersOnline === false && dto.offersInPerson === false) {
      throw new BadRequestException(
        'Selecione atendimento online, presencial ou ambos.'
      );
    }

    if (dto.offersInPerson && (!dto.city || !dto.state)) {
      throw new BadRequestException(
        'Cidade e estado sao obrigatorios para atendimento presencial.'
      );
    }
  }

  private async ensureRelatedEntitiesAreActive(
    specialtyIds: string[],
    approachIds: string[]
  ) {
    const [specialties, approaches] = await Promise.all([
      this.prisma.specialty.findMany({
        where: {
          id: {
            in: specialtyIds
          },
          active: true
        },
        select: {
          id: true
        }
      }),
      this.prisma.approach.findMany({
        where: {
          id: {
            in: approachIds
          },
          active: true
        },
        select: {
          id: true
        }
      })
    ]);

    if (specialties.length !== new Set(specialtyIds).size) {
      throw new BadRequestException('Uma ou mais especialidades sao invalidas.');
    }

    if (approaches.length !== new Set(approachIds).size) {
      throw new BadRequestException('Uma ou mais abordagens sao invalidas.');
    }
  }

  private async buildUniqueSlug(name: string, currentProfileId?: string) {
    const baseSlug = buildSlug(name);
    let slug = baseSlug;
    let suffix = 1;

    while (
      await this.prisma.psychologistProfile.findFirst({
        where: {
          slug,
          id: currentProfileId
            ? {
                not: currentProfileId
              }
            : undefined
        },
        select: {
          id: true
        }
      })
    ) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return slug;
  }

  private toProfileResponse(
    profile: Prisma.PsychologistProfileGetPayload<{
      include: typeof profileInclude;
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
      address: profile.address,
      whatsapp: profile.whatsapp,
      approvalStatus: profile.approvalStatus,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      specialties: profile.specialties.map(({ specialty }) => specialty),
      approaches: profile.approaches.map(({ approach }) => approach)
    };
  }

  private toPublicProfileResponse(
    profile: Prisma.PsychologistProfileGetPayload<{
      include: typeof profileInclude;
    }>
  ) {
    return {
      id: profile.id,
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
      whatsapp: profile.whatsapp,
      specialties: profile.specialties
        .filter(({ specialty }) => specialty.active)
        .map(({ specialty }) => ({
          id: specialty.id,
          name: specialty.name,
          slug: specialty.slug
        })),
      approaches: profile.approaches
        .filter(({ approach }) => approach.active)
        .map(({ approach }) => ({
          id: approach.id,
          name: approach.name,
          slug: approach.slug
        })),
      reviews: (profile.reviews ?? []).map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        patient: review.patient
      }))
    };
  }
}
