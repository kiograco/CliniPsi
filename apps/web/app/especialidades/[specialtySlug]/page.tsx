import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { unslug } from '@/lib/seo';
import { searchPsychologists } from '@/services/psychologists';

type SpecialtyPageProps = {
  params: Promise<{
    specialtySlug: string;
  }>;
};

export async function generateMetadata({
  params
}: SpecialtyPageProps): Promise<Metadata> {
  const { specialtySlug } = await params;
  const specialty = unslug(specialtySlug);

  return {
    title: `Psicologos especialistas em ${specialty} | DivulgaPsi`,
    description: `Encontre psicologos especialistas em ${specialty} para atendimento online ou presencial.`,
    alternates: {
      canonical: `/especialidades/${specialtySlug}`
    }
  };
}

export default async function SpecialtyPage({ params }: SpecialtyPageProps) {
  const { specialtySlug } = await params;
  const specialty = unslug(specialtySlug);
  const results = await searchPsychologists({
    specialtySlug,
    perPage: '24'
  });

  return (
    <main className="page-shell">
      <section className="search-page">
        <header className="search-header">
          <h1>Psicologos para {specialty}</h1>
          <p>{results.meta.total} profissionais encontrados</p>
        </header>

        <div className="result-grid">
          {results.data.map((profile) => (
            <article className="result-card" key={profile.id}>
              <div className="result-card-photo">
                {profile.photoUrl ? (
                  <Image
                    src={profile.photoUrl}
                    alt={profile.professionalName}
                    width={240}
                    height={240}
                    sizes="120px"
                    unoptimized
                  />
                ) : (
                  <span>{profile.professionalName.charAt(0)}</span>
                )}
              </div>
              <div>
                <h2>{profile.professionalName}</h2>
                <p>{profile.crp}</p>
                <p>
                  R$ {profile.consultationPrice.toFixed(2).replace('.', ',')} -{' '}
                  {profile.consultationDurationMinutes} min
                </p>
                <Link
                  className="button button-secondary"
                  href={`/psicologos/${profile.slug}`}
                >
                  Ver perfil
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
