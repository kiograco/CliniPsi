import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateAppointmentPaymentDto } from './dto/create-appointment-payment.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('plans')
  listPlans() {
    return this.paymentsService.listActivePlans();
  }

  @Post('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createPlan(@Body() dto: CreatePlanDto) {
    return this.paymentsService.createPlan(dto);
  }

  @Patch('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.paymentsService.updatePlan(id, dto);
  }

  @Post('subscriptions/checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  createSubscriptionCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubscriptionCheckoutDto
  ) {
    return this.paymentsService.createSubscriptionCheckout(user, dto);
  }

  @Get('subscriptions/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PSYCHOLOGIST)
  getMySubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.getMySubscription(user);
  }

  @Post('appointments/checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  createAppointmentPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentPaymentDto
  ) {
    return this.paymentsService.createAppointmentPayment(user, dto);
  }

  @Post('webhooks/asaas')
  processAsaasWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('x-divulgapsi-signature') signature: string | undefined,
    @Headers('x-divulgapsi-timestamp') timestamp: string | undefined,
    @Headers('x-divulgapsi-event-id') eventId: string | undefined,
    @Body() body: unknown
  ) {
    return this.paymentsService.processAsaasWebhook({
      rawBody: request.rawBody,
      signature,
      timestamp,
      eventId,
      body
    });
  }
}
