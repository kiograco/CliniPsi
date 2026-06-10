import { PsychologistApprovalStatus, UserRole, UserStatus } from '@prisma/client';
import { AdminService } from '../../src/modules/admin/admin.service';

function createService() {
  const prisma = {
    user: {
      findMany: jest.fn(),
      update: jest.fn()
    },
    psychologistProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    appointment: {
      findMany: jest.fn()
    },
    specialty: {
      create: jest.fn(),
      update: jest.fn()
    },
    approach: {
      create: jest.fn(),
      update: jest.fn()
    }
  };

  return {
    service: new AdminService(prisma as never),
    prisma
  };
}

describe('AdminService', () => {
  it('lista usuarios sem passwordHash', async () => {
    const { service, prisma } = createService();
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-id',
        name: 'Admin',
        email: 'admin@example.com',
        passwordHash: 'hash',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const result = await service.listUsers();

    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('aprova psicologo pendente', async () => {
    const { service, prisma } = createService();
    prisma.psychologistProfile.findUnique.mockResolvedValue({ id: 'profile-id' });
    prisma.psychologistProfile.update.mockResolvedValue({
      id: 'profile-id',
      userId: 'user-id',
      professionalName: 'Dra Ana Silva',
      slug: 'dra-ana-silva',
      crp: 'CRP 06/123456',
      photoUrl: null,
      bio: 'Bio',
      consultationPrice: { toNumber: () => 180 },
      consultationDurationMinutes: 50,
      offersOnline: true,
      offersInPerson: false,
      city: null,
      state: null,
      approvalStatus: PsychologistApprovalStatus.APPROVED,
      approvedAt: new Date(),
      user: {
        id: 'user-id',
        name: 'Ana',
        email: 'ana@example.com',
        role: UserRole.PSYCHOLOGIST,
        status: UserStatus.ACTIVE
      },
      specialties: [],
      approaches: []
    });

    const result = await service.approvePsychologist(
      {
        id: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE
      },
      'profile-id'
    );

    expect(result.approvalStatus).toBe(PsychologistApprovalStatus.APPROVED);
    expect(prisma.psychologistProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvedById: 'admin-id'
        })
      })
    );
  });
});
