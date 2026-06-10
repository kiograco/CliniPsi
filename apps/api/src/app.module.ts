import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './modules/admin/admin.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthController } from './modules/health/health.controller';
import { PaymentsModule } from './modules/payments/payments.module';
import { PsychologistsModule } from './modules/psychologists/psychologists.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { SearchModule } from './modules/search/search.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    PsychologistsModule,
    SearchModule,
    ScheduleModule,
    AppointmentsModule,
    AdminModule,
    PaymentsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
