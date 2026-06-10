import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { hashPassword } from '../../src/modules/auth/utils/password-hash.util';

const activeUser = {
  id: '6ee38318-1fa5-4a04-8ad1-1387715f5609',
  name: 'Paciente Teste',
  email: 'paciente@example.com',
  passwordHash: '',
  role: UserRole.PATIENT,
  status: UserStatus.ACTIVE,
  emailVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

function createService() {
  const prisma = {
    user: {
      create: jest.fn()
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    $transaction: jest.fn()
  };

  const usersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    toPublicUser: jest.fn(({ passwordHash: _passwordHash, ...user }) => user)
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access-token')
  };

  const notificationsService = {
    enqueueRegistrationConfirmation: jest.fn()
  };

  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        NODE_ENV: 'test',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d'
      };

      return values[key] ?? fallback;
    }),
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret'
      };

      return values[key];
    })
  };

  const service = new AuthService(
    prisma as never,
    usersService as unknown as UsersService,
    jwtService as unknown as JwtService,
    configService as unknown as ConfigService,
    notificationsService as never
  );

  return {
    service,
    prisma,
    usersService,
    jwtService,
    notificationsService
  };
}

describe('AuthService', () => {
  it('registra usuario novo e nao retorna passwordHash', async () => {
    const { service, prisma, usersService, notificationsService } =
      createService();
    usersService.findByEmail.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(activeUser);
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.register({
      name: 'Paciente Teste',
      email: 'PACIENTE@example.com',
      password: 'senha-forte',
      role: UserRole.PATIENT
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'paciente@example.com',
          role: UserRole.PATIENT
        })
      })
    );
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toHaveLength(96);
    expect(
      notificationsService.enqueueRegistrationConfirmation
    ).toHaveBeenCalledWith(activeUser.id);
  });

  it('bloqueia cadastro com e-mail duplicado', async () => {
    const { service, usersService } = createService();
    usersService.findByEmail.mockResolvedValue(activeUser);

    await expect(
      service.register({
        name: 'Paciente Teste',
        email: 'paciente@example.com',
        password: 'senha-forte',
        role: UserRole.PATIENT
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('autentica usuario ativo com senha valida', async () => {
    const { service, prisma, usersService } = createService();
    const passwordHash = await hashPassword('senha-forte');
    usersService.findByEmail.mockResolvedValue({
      ...activeUser,
      passwordHash
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.login({
      email: 'paciente@example.com',
      password: 'senha-forte'
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toHaveLength(96);
  });

  it('rejeita login com senha invalida', async () => {
    const { service, usersService } = createService();
    const passwordHash = await hashPassword('senha-forte');
    usersService.findByEmail.mockResolvedValue({
      ...activeUser,
      passwordHash
    });

    await expect(
      service.login({
        email: 'paciente@example.com',
        password: 'senha-errada'
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
