import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole, UserStatus } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  comparePassword,
  hashPassword
} from './utils/password-hash.util';

const ACCESS_TOKEN_FALLBACK_EXPIRES_IN = '15m';
const REFRESH_TOKEN_FALLBACK_EXPIRES_IN = '7d';
const PASSWORD_RESET_TOKEN_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException('E-mail ja cadastrado.');
    }

    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException('Perfil de cadastro invalido.');
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: await hashPassword(dto.password),
        role: dto.role
      }
    });

    await this.notificationsService.enqueueRegistrationConfirmation(user.id);

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !(await comparePassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Usuario inativo ou bloqueado.');
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashOpaqueToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash
      },
      include: {
        user: true
      }
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date() ||
      storedToken.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    await this.prisma.refreshToken.update({
      where: {
        id: storedToken.id
      },
      data: {
        revokedAt: new Date()
      }
    });

    return this.buildAuthResponse(storedToken.user);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hashOpaqueToken(refreshToken),
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return {
      success: true
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || user.status !== UserStatus.ACTIVE) {
      return this.buildPasswordResetAcceptedResponse();
    }

    const resetToken = this.generateOpaqueToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashOpaqueToken(resetToken),
        expiresAt: this.minutesFromNow(PASSWORD_RESET_TOKEN_MINUTES)
      }
    });

    return this.buildPasswordResetAcceptedResponse(resetToken);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashOpaqueToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash
      },
      include: {
        user: true
      }
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date() ||
      resetToken.user.status !== UserStatus.ACTIVE
    ) {
      throw new BadRequestException('Token de recuperacao invalido.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: resetToken.userId
        },
        data: {
          passwordHash: await hashPassword(dto.password)
        }
      }),
      this.prisma.passwordResetToken.update({
        where: {
          id: resetToken.id
        },
        data: {
          usedAt: new Date()
        }
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      })
    ]);

    return {
      success: true
    };
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado.');
    }

    return this.usersService.toPublicUser(user);
  }

  private async buildAuthResponse(user: User) {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = this.generateOpaqueToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashOpaqueToken(refreshToken),
        expiresAt: this.refreshTokenExpirationDate()
      }
    });

    return {
      user: this.usersService.toPublicUser(user),
      accessToken,
      refreshToken
    };
  }

  private signAccessToken(user: User) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          ACCESS_TOKEN_FALLBACK_EXPIRES_IN
        )
      }
    );
  }

  private buildPasswordResetAcceptedResponse(resetToken?: string) {
    const response: {
      success: true;
      resetToken?: string;
    } = {
      success: true
    };

    if (
      resetToken &&
      this.configService.get<string>('NODE_ENV') !== 'production'
    ) {
      response.resetToken = resetToken;
    }

    return response;
  }

  private refreshTokenExpirationDate() {
    const value = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      REFRESH_TOKEN_FALLBACK_EXPIRES_IN
    );

    const days = Number(value.replace('d', ''));
    if (!Number.isNaN(days) && value.endsWith('d')) {
      return this.daysFromNow(days);
    }

    return this.daysFromNow(7);
  }

  private generateOpaqueToken() {
    return randomBytes(48).toString('hex');
  }

  private hashOpaqueToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private daysFromNow(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private minutesFromNow(minutes: number) {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }
}
