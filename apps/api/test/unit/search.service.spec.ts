import { BadRequestException } from '@nestjs/common';
import {
  Prisma,
  PsychologistApprovalStatus
} from '@prisma/client';
import { SearchModality } from '../../src/modules/search/dto/search-psychologists.dto';
import { SearchService } from '../../src/modules/search/search.service';

const profile = {
  id: '3502038f-dc98-43e0-a661-c9e3f5780341',
  userId: '7e1b0dc9-2b24-42a9-8b82-5b79081ac524',
  professionalName: 'Dra Ana Silva',
  slug: 'dra-ana-silva',
  crp: 'CRP 06/123456',
  photoUrl: null,
  bio: 'Bio publica',
  consultationPrice: new Prisma.Decimal(180),
  consultationDurationMinutes: 50,
  offersOnline: true,
  offersInPerson: false,
  city: 'Sao Paulo',
  state: 'SP',
  address: null,
  whatsapp: null,
  approvalStatus: PsychologistApprovalStatus.APPROVED,
  approvedAt: null,
  approvedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  specialties: [
    {
      specialty: {
        id: '4b3e52bd-53a5-4de4-b379-b4993f4e0e1b',
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
        id: 'f1f62732-1410-4081-b5c3-94b072b7a873',
        name: 'TCC',
        slug: 'tcc',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  ]
};

function createService() {
  const prisma = {
    psychologistProfile: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    $transaction: jest.fn(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations)
    )
  };

  return {
    service: new SearchService(prisma as never),
    prisma
  };
}

describe('SearchService', () => {
  it('busca apenas psicologos aprovados com filtros', async () => {
    const { service, prisma } = createService();
    prisma.psychologistProfile.findMany.mockResolvedValue([profile]);
    prisma.psychologistProfile.count.mockResolvedValue(1);

    const result = await service.searchPsychologists({
      city: 'Sao Paulo',
      state: 'sp',
      modality: SearchModality.ONLINE,
      page: 1,
      perPage: 12
    });

    expect(prisma.psychologistProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          approvalStatus: PsychologistApprovalStatus.APPROVED,
          offersOnline: true,
          state: 'SP'
        })
      })
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).not.toHaveProperty('whatsapp');
    expect(result.meta.total).toBe(1);
  });

  it('rejeita preco minimo maior que preco maximo', async () => {
    const { service } = createService();

    await expect(
      service.searchPsychologists({
        minPrice: 300,
        maxPrice: 100,
        page: 1,
        perPage: 12
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
