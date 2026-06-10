import { env } from '@/lib/env';
import type { PublicPsychologistProfile } from '@/types/psychologist';

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
