import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PsychologistApprovalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SearchModality,
  SearchPsychologistsDto
} from './dto/search-psychologists.dto';

const searchInclude = {
  specialties: {
    include: {
      specialty: true
    }
  },
  approaches: {
    include: {
      approach: true
    }
  }
} satisfies Prisma.PsychologistProfileInclude;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchPsychologists(query: SearchPsychologistsDto) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('Preco minimo nao pode exceder o maximo.');
    }

    const where: Prisma.PsychologistProfileWhereInput = {
      approvalStatus: PsychologistApprovalStatus.APPROVED,
      city: query.city
        ? {
            equals: query.city.trim(),
            mode: 'insensitive'
          }
        : undefined,
      state: query.state ? query.state.trim().toUpperCase() : undefined,
      consultationPrice: this.buildPriceFilter(query),
      offersOnline:
        query.modality === SearchModality.ONLINE ? true : undefined,
      offersInPerson:
        query.modality === SearchModality.IN_PERSON ? true : undefined,
      specialties:
        query.specialtyId || query.specialtySlug
          ? {
              some: {
                specialty: {
                  id: query.specialtyId,
                  slug: query.specialtySlug,
                  active: true
                }
              }
            }
          : undefined,
      approaches:
        query.approachId || query.approachSlug
          ? {
              some: {
                approach: {
                  id: query.approachId,
                  slug: query.approachSlug,
                  active: true
                }
              }
            }
          : undefined
    };

    const page = query.page;
    const perPage = query.perPage;
    const skip = (page - 1) * perPage;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.psychologistProfile.findMany({
        where,
        include: searchInclude,
        orderBy: [
          {
            professionalName: 'asc'
          }
        ],
        skip,
        take: perPage
      }),
      this.prisma.psychologistProfile.count({
        where
      })
    ]);

    return {
      data: items.map((profile) => this.toSearchResult(profile)),
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      }
    };
  }

  private buildPriceFilter(query: SearchPsychologistsDto) {
    if (query.minPrice === undefined && query.maxPrice === undefined) {
      return undefined;
    }

    return {
      gte:
        query.minPrice === undefined
          ? undefined
          : new Prisma.Decimal(query.minPrice),
      lte:
        query.maxPrice === undefined
          ? undefined
          : new Prisma.Decimal(query.maxPrice)
    };
  }

  private toSearchResult(
    profile: Prisma.PsychologistProfileGetPayload<{
      include: typeof searchInclude;
    }>
  ) {
    return {
      id: profile.id,
      professionalName: profile.professionalName,
      slug: profile.slug,
      crp: profile.crp,
      photoUrl: profile.photoUrl,
      bio: profile.bio,
      consultationPrice: profile.consultationPrice.toNumber(),
      consultationDurationMinutes: profile.consultationDurationMinutes,
      offersOnline: profile.offersOnline,
      offersInPerson: profile.offersInPerson,
      city: profile.city,
      state: profile.state,
      specialties: profile.specialties
        .filter(({ specialty }) => specialty.active)
        .map(({ specialty }) => ({
          id: specialty.id,
          name: specialty.name,
          slug: specialty.slug
        })),
      approaches: profile.approaches
        .filter(({ approach }) => approach.active)
        .map(({ approach }) => ({
          id: approach.id,
          name: approach.name,
          slug: approach.slug
        }))
    };
  }
}
