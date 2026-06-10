import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { unslug } from '@/lib/seo';
import { searchPsychologists } from '@/services/psychologists';

type CityPageProps = {
  params: Promise<{
    citySlug: string;
  }>;
};

export async function generateMetadata({
  params
}: CityPageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const city = unslug(citySlug);

  return {
    title: `Psicologos em ${city} | DivulgaPsi`,
    description: `Encontre psicologos em ${city} para atendimento online ou presencial.`,
    alternates: {
      canonical: `/cidades/${citySlug}`
    }
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;
  const city = unslug(citySlug);
  const results = await searchPsychologists({
    city,
    perPage: '24'
  });

  return (
    <main className="page-shell">
      <section className="search-page">
        <header className="search-header">
          <h1>Psicologos em {city}</h1>
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
