import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppointmentStatus,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
  UserRole
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAppointmentPaymentDto } from './dto/create-appointment-payment.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AsaasProvider } from './providers/asaas.provider';

type WebhookInput = {
  rawBody?: Buffer;
  signature?: string;
  timestamp?: string;
  eventId?: string;
  body: unknown;
};

type AsaasWebhookPayload = {
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    externalReference?: string;
  };
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly asaasProvider: AsaasProvider,
    private readonly notificationsService: NotificationsService
  ) {}

  listActivePlans() {
    return this.prisma.plan.findMany({
      where: {
        active: true
      },
      orderBy: {
        price: 'asc'
      }
    });
  }

  createPlan(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        name: dto.name.trim(),
        price: new Prisma.Decimal(dto.price),
        durationDays: dto.durationDays,
        active: dto.active
      }
    });
  }

  updatePlan(planId: string, dto: UpdatePlanDto) {
    return this.prisma.plan.update({
      where: {
        id: planId
      },
      data: {
        name: dto.name?.trim(),
        price:
          dto.price === undefined ? undefined : new Prisma.Decimal(dto.price),
        durationDays: dto.durationDays,
        active: dto.active
      }
    });
  }

  async createSubscriptionCheckout(
    user: AuthenticatedUser,
    dto: CreateSubscriptionCheckoutDto
  ) {
    const profile = await this.getOwnedPsychologistProfile(user);
    const plan = await this.prisma.plan.findFirst({
      where: {
        id: dto.planId,
        active: true
      }
    });

    if (!plan) {
      throw new NotFoundException('Plano nao encontrado.');
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + plan.durationDays);

    const subscription = await this.prisma.subscription.create({
      data: {
        psychologistId: profile.id,
        planId: plan.id,
        status: SubscriptionStatus.PAST_DUE,
        startsAt,
        endsAt
      }
    });

    const providerPayment = await this.asaasProvider.createPayment({
      externalReference: `subscription:${subscription.id}`,
      description: `Assinatura ${plan.name}`,
      amount: plan.price.toNumber()
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        amount: plan.price,
        status: PaymentStatus.PENDING,
        providerPaymentId: providerPayment.providerPaymentId,
        checkoutUrl: providerPayment.checkoutUrl
      }
    });

    return {
      subscription,
      payment
    };
  }

  async getMySubscription(user: AuthenticatedUser) {
    const profile = await this.getOwnedPsychologistProfile(user);

    return this.prisma.subscription.findFirst({
      where: {
        psychologistId: profile.id
      },
      include: {
        plan: true,
        payments: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async createAppointmentPayment(
    user: AuthenticatedUser,
    dto: CreateAppointmentPaymentDto
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: dto.appointmentId,
        patientId: user.id
      },
      include: {
        psychologist: true
      }
    });

    if (!appointment) {
      throw new NotFoundException('Consulta nao encontrada.');
    }

    if (appointment.status === AppointmentStatus.CANCELED) {
      throw new BadRequestException('Consulta cancelada nao pode ser paga.');
    }

    const providerPayment = await this.asaasProvider.createPayment({
      externalReference: `appointment:${appointment.id}`,
      description: `Consulta com ${appointment.psychologist.professionalName}`,
      amount: appointment.psychologist.consultationPrice.toNumber()
    });

    return this.prisma.payment.create({
      data: {
        userId: user.id,
        appointmentId: appointment.id,
        amount: appointment.psychologist.consultationPrice,
        status: PaymentStatus.PENDING,
        providerPaymentId: providerPayment.providerPaymentId,
        checkoutUrl: providerPayment.checkoutUrl
      }
    });
  }

  async processAsaasWebhook(input: WebhookInput) {
    this.verifyWebhookSignature(input);

    const payload = input.body as AsaasWebhookPayload;
    const eventType = payload.event ?? 'UNKNOWN';
    const eventId =
      input.eventId ??
      payload.payment?.id ??
      `${eventType}:${input.timestamp ?? Date.now().toString()}`;

    const existingEvent = await this.prisma.paymentWebhookEvent.findUnique({
      where: {
        eventId
      }
    });

    if (existingEvent) {
      return {
        received: true,
        replay: true
      };
    }

    await this.prisma.paymentWebhookEvent.create({
      data: {
        eventId,
        eventType
      }
    });

    const providerPaymentId = payload.payment?.id;
    if (!providerPaymentId) {
      return {
        received: true
      };
    }

    const paymentStatus = this.mapAsaasPaymentStatus(payload.payment?.status);
    const payment = await this.prisma.payment.findUnique({
      where: {
        providerPaymentId
      }
    });

    if (!payment) {
      return {
        received: true
      };
    }

    await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: {
          id: payment.id
        },
        data: {
          status: paymentStatus,
          paidAt: paymentStatus === PaymentStatus.PAID ? new Date() : undefined
        }
      });

      if (updatedPayment.subscriptionId) {
        await tx.subscription.update({
          where: {
            id: updatedPayment.subscriptionId
          },
          data: {
            status:
              paymentStatus === PaymentStatus.PAID
                ? SubscriptionStatus.ACTIVE
                : SubscriptionStatus.PAST_DUE
          }
        });
      }

      if (
        updatedPayment.appointmentId &&
        paymentStatus === PaymentStatus.PAID
      ) {
        await tx.appointment.update({
          where: {
            id: updatedPayment.appointmentId
          },
          data: {
            status: AppointmentStatus.CONFIRMED
          }
        });
      }

      await tx.paymentWebhookEvent.update({
        where: {
          eventId
        },
        data: {
          processedAt: new Date()
        }
      });
    });

    if (paymentStatus === PaymentStatus.PAID) {
      await this.notificationsService.enqueuePaymentApproved(payment.id);
    }

    return {
      received: true
    };
  }

  async ensurePsychologistCanUseSaas(psychologistId: string) {
    const latestSubscription = await this.prisma.subscription.findFirst({
      where: {
        psychologistId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestSubscription) {
      return;
    }

    if (
      latestSubscription.status !== SubscriptionStatus.ACTIVE ||
      latestSubscription.endsAt <= new Date()
    ) {
      throw new ForbiddenException('Assinatura inativa ou inadimplente.');
    }
  }

  private verifyWebhookSignature(input: WebhookInput) {
    const secret = this.configService.get<string>('PAYMENT_WEBHOOK_SECRET');

    if (!secret) {
      throw new UnauthorizedException('Webhook sem segredo configurado.');
    }

    if (!input.signature || !input.timestamp) {
      throw new UnauthorizedException('Assinatura do webhook ausente.');
    }

    const timestampNumber = Number(input.timestamp);
    const toleranceSeconds = Number(
      this.configService.get<string>('PAYMENT_WEBHOOK_TOLERANCE_SECONDS', '300')
    );

    if (
      Number.isNaN(timestampNumber) ||
      Math.abs(Date.now() - timestampNumber) > toleranceSeconds * 1000
    ) {
      throw new UnauthorizedException('Timestamp do webhook invalido.');
    }

    const rawBody = input.rawBody?.toString('utf8') ?? JSON.stringify(input.body);
    const expected = createHmac('sha256', secret)
      .update(`${input.timestamp}.${rawBody}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(input.signature, 'hex');

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new UnauthorizedException('Assinatura do webhook invalida.');
    }
  }

  private mapAsaasPaymentStatus(status?: string) {
    switch (status) {
      case 'RECEIVED':
      case 'CONFIRMED':
      case 'RECEIVED_IN_CASH':
        return PaymentStatus.PAID;
      case 'REFUNDED':
        return PaymentStatus.REFUNDED;
      case 'OVERDUE':
      case 'FAILED':
        return PaymentStatus.FAILED;
      case 'CANCELED':
        return PaymentStatus.CANCELED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private async getOwnedPsychologistProfile(user: AuthenticatedUser) {
    if (user.role !== UserRole.PSYCHOLOGIST) {
      throw new ForbiddenException('Apenas psicologos podem assinar planos.');
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
}
