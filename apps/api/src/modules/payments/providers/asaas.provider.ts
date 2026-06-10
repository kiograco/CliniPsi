import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CreatePaymentInput = {
  externalReference: string;
  description: string;
  amount: number;
};

@Injectable()
export class AsaasProvider {
  constructor(private readonly configService: ConfigService) {}

  async createPayment(input: CreatePaymentInput) {
    const apiKey = this.configService.get<string>('ASAAS_API_KEY');
    const apiUrl = this.configService.get<string>(
      'ASAAS_API_URL',
      'https://sandbox.asaas.com/api/v3'
    );

    if (!apiKey) {
      return {
        providerPaymentId: `local_${input.externalReference}`,
        checkoutUrl: null
      };
    }

    const response = await fetch(`${apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey
      },
      body: JSON.stringify({
        billingType: 'UNDEFINED',
        value: input.amount,
        description: input.description,
        externalReference: input.externalReference
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao criar cobranca no Asaas.');
    }

    const data = (await response.json()) as {
      id?: string;
      invoiceUrl?: string;
      bankSlipUrl?: string;
    };

    return {
      providerPaymentId: data.id ?? `asaas_${input.externalReference}`,
      checkoutUrl: data.invoiceUrl ?? data.bankSlipUrl ?? null
    };
  }
}
