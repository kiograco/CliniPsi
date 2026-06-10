import { ConfigService } from '@nestjs/config';
import {
  PaymentStatus,
  SubscriptionStatus,
  UserRole,
  UserStatus
} from '@prisma/client';
import { createHmac } from 'crypto';
import { PaymentsService } from '../../src/modules/payments/payments.service';

const psychologist = {
  id: '84a49908-a72d-460e-b839-11eb70e06b36',
  email: 'psi@example.com',
  role: UserRole.PSYCHOLOGIST,
  status: UserStatus.ACTIVE
};

function createService() {
  const prisma = {
    plan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    psychologistProfile: {
      findUnique: jest.fn()
    },
    subscription: {
      create: jest.fn(),
      findFirst: jest.fn()
    },
    payment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    appointment: {
      findFirst: jest.fn()
    },
    paymentWebhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        payment: {
          update: jest.fn().mockResolvedValue({
            id: 'payment-id',
            subscriptionId: 'subscription-id',
            appointmentId: 'appointment-id'
          })
        },
        subscription: {
          update: jest.fn()
        },
        appointment: {
          update: jest.fn()
        },
        paymentWebhookEvent: {
          update: jest.fn()
        }
      })
    )
  };

  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        PAYMENT_WEBHOOK_SECRET: 'webhook-secret',
        PAYMENT_WEBHOOK_TOLERANCE_SECONDS: '300'
      };

      return values[key] ?? fallback;
    })
  };

  const asaasProvider = {
    createPayment: jest.fn().mockResolvedValue({
      providerPaymentId: 'asaas-payment-id',
      checkoutUrl: 'https://sandbox.asaas.local/payments/asaas-payment-id'
    })
  };
  const notificationsService = {
    enqueuePaymentApproved: jest.fn()
  };

  return {
    service: new PaymentsService(
      prisma as never,
      configService as unknown as ConfigService,
      asaasProvider as never,
      notificationsService as never
    ),
    prisma,
    asaasProvider,
    notificationsService
  };
}

describe('PaymentsService', () => {
  it('cria checkout de assinatura como pagamento pendente', async () => {
    const { service, prisma, asaasProvider } = createService();
    prisma.psychologistProfile.findUnique.mockResolvedValue({
      id: 'profile-id'
    });
    prisma.plan.findFirst.mockResolvedValue({
      id: 'plan-id',
      name: 'Mensal',
      price: { toNumber: () => 99 },
      durationDays: 30
    });
    prisma.subscription.create.mockResolvedValue({
      id: 'subscription-id',
      status: SubscriptionStatus.PAST_DUE
    });
    prisma.payment.create.mockResolvedValue({
      id: 'payment-id',
      status: PaymentStatus.PENDING
    });

    const result = await service.createSubscriptionCheckout(psychologist, {
      planId: 'plan-id'
    });

    expect(asaasProvider.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        externalReference: 'subscription:subscription-id',
        amount: 99
      })
    );
    expect(result.payment.status).toBe(PaymentStatus.PENDING);
  });

  it('processa webhook assinado e confirma pagamento', async () => {
    const { service, prisma, notificationsService } = createService();
    const body = {
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'asaas-payment-id',
        status: 'RECEIVED'
      }
    };
    const rawBody = Buffer.from(JSON.stringify(body));
    const timestamp = Date.now().toString();
    const signature = createHmac('sha256', 'webhook-secret')
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');

    prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    prisma.paymentWebhookEvent.create.mockResolvedValue({});
    prisma.payment.findUnique.mockResolvedValue({
      id: 'payment-id',
      providerPaymentId: 'asaas-payment-id'
    });

    const result = await service.processAsaasWebhook({
      rawBody,
      signature,
      timestamp,
      eventId: 'event-id',
      body
    });

    expect(result.received).toBe(true);
    expect(notificationsService.enqueuePaymentApproved).toHaveBeenCalledWith(
      'payment-id'
    );
    expect(prisma.paymentWebhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: 'event-id'
        })
      })
    );
  });

  it('ignora replay de webhook ja processado', async () => {
    const { service, prisma } = createService();
    const body = { event: 'PAYMENT_RECEIVED' };
    const rawBody = Buffer.from(JSON.stringify(body));
    const timestamp = Date.now().toString();
    const signature = createHmac('sha256', 'webhook-secret')
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');

    prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
      id: 'webhook-event-id'
    });

    const result = await service.processAsaasWebhook({
      rawBody,
      signature,
      timestamp,
      eventId: 'event-id',
      body
    });

    expect(result).toEqual({
      received: true,
      replay: true
    });
  });
});
