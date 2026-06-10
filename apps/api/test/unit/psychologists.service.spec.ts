import {
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import {
  Prisma,
  PsychologistApprovalStatus,
  UserRole,
  UserStatus
} from '@prisma/client';
import { PsychologistsService } from '../../src/modules/psychologists/psychologists.service';

const psychologistUser = {
  id: '84a49908-a72d-460e-b839-11eb70e06b36',
  email: 'psi@example.com',
  role: UserRole.PSYCHOLOGIST,
  status: UserStatus.ACTIVE
};

const specialtyId = '4b3e52bd-53a5-4de4-b379-b4993f4e0e1b';
const approachId = 'f1f62732-1410-4081-b5c3-94b072b7a873';

const createDto = {
  professionalName: 'Dra Ana Silva',
  crp: 'CRP 06/123456',
  bio: 'Bio profissional com informacoes suficientes para apresentar a psicologa, sua experiencia clinica e forma de atendimento aos pacientes.',
  consultationPrice: 180,
  consultationDurationMinutes: 50,
  offersOnline: true,
  offersInPerson: false,
  specialtyIds: [specialtyId],
  approachIds: [approachId]
};

function createProfile(overrides = {}) {
  return {
    id: '4d03d371-79cc-4146-bdcb-4d9495496f33',
    userId: psychologistUser.id,
    professionalName: createDto.professionalName,
    slug: 'dra-ana-silva',
    crp: createDto.crp,
    photoUrl: null,
    bio: createDto.bio,
    consultationPrice: new Prisma.Decimal(createDto.consultationPrice),
    consultationDurationMinutes: createDto.consultationDurationMinutes,
    offersOnline: true,
    offersInPerson: false,
    city: null,
    state: null,
    address: null,
    whatsapp: null,
    approvalStatus: PsychologistApprovalStatus.PENDING,
    approvedAt: null,
    approvedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    specialties: [
      {
        specialty: {
          id: specialtyId,
          name: 'Ansiedade',
          slug: 'ansiedade',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    ],
    approaches: [
      {
        approach: {
          id: approachId,
          name: 'Terapia Cognitivo-Comportamental',
          slug: 'terapia-cognitivo-comportamental',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    ],
    ...overrides
  };
}

function createService() {
  const prisma = {
    psychologistProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    specialty: {
      findMany: jest.fn()
    },
    approach: {
      findMany: jest.fn()
    }
  };

  const service = new PsychologistsService(prisma as never);

  return {
    service,
    prisma
  };
}

describe('PsychologistsService', () => {
  it('cria perfil pendente para usuario psicologo', async () => {
    const { service, prisma } = createService();
    const profile = createProfile();

    prisma.psychologistProfile.findUnique.mockResolvedValue(null);
    prisma.psychologistProfile.findFirst.mockResolvedValue(null);
    prisma.specialty.findMany.mockResolvedValue([{ id: specialtyId }]);
    prisma.approach.findMany.mockResolvedValue([{ id: approachId }]);
    prisma.psychologistProfile.create.mockResolvedValue(profile);

    const result = await service.createProfile(psychologistUser, createDto);

    expect(prisma.psychologistProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: psychologistUser.id,
          slug: 'dra-ana-silva',
          approvalStatus: PsychologistApprovalStatus.PENDING
        })
      })
    );
    expect(result.consultationPrice).toBe(180);
    expect(result.specialties).toHaveLength(1);
  });

  it('bloqueia criacao de perfil para paciente', async () => {
    const { service } = createService();

    await expect(
      service.createProfile(
        {
          ...psychologistUser,
          role: UserRole.PATIENT
        },
        createDto
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exige ao menos uma modalidade de atendimento', async () => {
    const { service } = createService();

    await expect(
      service.createProfile(psychologistUser, {
        ...createDto,
        offersOnline: false,
        offersInPerson: false
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige cidade e estado para atendimento presencial', async () => {
    const { service } = createService();

    await expect(
      service.createProfile(psychologistUser, {
        ...createDto,
        offersOnline: false,
        offersInPerson: true
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('retorna erro quando perfil ainda nao existe', async () => {
    const { service, prisma } = createService();
    prisma.psychologistProfile.findUnique.mockResolvedValue(null);

    await expect(service.getMyProfile(psychologistUser)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('retorna perfil publico somente quando aprovado', async () => {
    const { service, prisma } = createService();
    prisma.psychologistProfile.findUnique.mockResolvedValue(
      createProfile({
        approvalStatus: PsychologistApprovalStatus.APPROVED
      })
    );

    const result = await service.getPublicProfileBySlug('dra-ana-silva');

    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('approvalStatus');
    expect(result.professionalName).toBe('Dra Ana Silva');
  });

  it('nao retorna perfil pendente na pagina publica', async () => {
    const { service, prisma } = createService();
    prisma.psychologistProfile.findUnique.mockResolvedValue(createProfile());

    await expect(
      service.getPublicProfileBySlug('dra-ana-silva')
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
