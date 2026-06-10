import { env } from '@/lib/env';
import type {
  PublicPsychologistProfile,
  SearchPsychologistsResponse
} from '@/types/psychologist';

export type SearchPsychologistsParams = {
  city?: string;
  state?: string;
  modality?: 'ONLINE' | 'IN_PERSON';
  minPrice?: string;
  maxPrice?: string;
  specialtySlug?: string;
  approachSlug?: string;
  page?: string;
};

export async function getPublicPsychologistProfile(slug: string) {
  const response = await fetch(
    `${env.apiUrl}/psychologists/${encodeURIComponent(slug)}/public`,
    {
      next: {
        revalidate: 300
      }
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Falha ao carregar perfil publico do psicologo.');
  }

  return (await response.json()) as PublicPsychologistProfile;
}

export async function searchPsychologists(params: SearchPsychologistsParams) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const response = await fetch(
    `${env.apiUrl}/search/psychologists?${searchParams.toString()}`,
    {
      next: {
        revalidate: 120
      }
    }
  );

  if (!response.ok) {
    throw new Error('Falha ao buscar psicologos.');
  }

  return (await response.json()) as SearchPsychologistsResponse;
}
