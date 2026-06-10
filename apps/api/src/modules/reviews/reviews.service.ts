import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AppointmentStatus,
  Prisma,
  ReviewModerationStatus
} from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

const reviewInclude = {
  patient: {
    select: {
      id: true,
      name: true
    }
  },
  psychologist: {
    select: {
      id: true,
      professionalName: true,
      slug: true
    }
  },
  appointment: {
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true
    }
  }
} satisfies Prisma.ReviewInclude;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateReviewDto) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: dto.appointmentId,
        patientId: user.id
      },
      include: {
        review: true
      }
    });

    if (!appointment) {
      throw new NotFoundException('Consulta nao encontrada.');
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Avaliacao permitida apenas apos consulta concluida.'
      );
    }

    if (appointment.review) {
      throw new BadRequestException('Consulta ja possui avaliacao.');
    }

    const review = await this.prisma.review.create({
      data: {
        appointmentId: appointment.id,
        psychologistId: appointment.psychologistId,
        patientId: user.id,
        rating: dto.rating,
        comment: dto.comment.trim(),
        moderationStatus: ReviewModerationStatus.PENDING
      },
      include: reviewInclude
    });

    return this.toReviewResponse(review);
  }

  async listApprovedForPsychologist(psychologistId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        psychologistId,
        moderationStatus: ReviewModerationStatus.APPROVED
      },
      include: reviewInclude,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return reviews.map((review) => this.toPublicReviewResponse(review));
  }

  async listPending() {
    const reviews = await this.prisma.review.findMany({
      where: {
        moderationStatus: ReviewModerationStatus.PENDING
      },
      include: reviewInclude,
      orderBy: {
        createdAt: 'asc'
      }
    });

    return reviews.map((review) => this.toReviewResponse(review));
  }

  async moderate(
    admin: AuthenticatedUser,
    reviewId: string,
    dto: ModerateReviewDto
  ) {
    if (dto.status === ReviewModerationStatus.PENDING) {
      throw new BadRequestException('Moderacao deve aprovar ou rejeitar.');
    }

    const existing = await this.prisma.review.findUnique({
      where: {
        id: reviewId
      }
    });

    if (!existing) {
      throw new NotFoundException('Avaliacao nao encontrada.');
    }

    const review = await this.prisma.review.update({
      where: {
        id: reviewId
      },
      data: {
        moderationStatus: dto.status,
        moderatedAt: new Date(),
        moderatedById: admin.id
      },
      include: reviewInclude
    });

    return this.toReviewResponse(review);
  }

  private toReviewResponse(
    review: Prisma.ReviewGetPayload<{
      include: typeof reviewInclude;
    }>
  ) {
    return {
      id: review.id,
      appointmentId: review.appointmentId,
      psychologistId: review.psychologistId,
      patientId: review.patientId,
      rating: review.rating,
      comment: review.comment,
      moderationStatus: review.moderationStatus,
      moderatedAt: review.moderatedAt,
      createdAt: review.createdAt,
      patient: review.patient,
      psychologist: review.psychologist,
      appointment: review.appointment
    };
  }

  private toPublicReviewResponse(
    review: Prisma.ReviewGetPayload<{
      include: typeof reviewInclude;
    }>
  ) {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      patient: {
        id: review.patient.id,
        name: review.patient.name
      }
    };
  }
}
