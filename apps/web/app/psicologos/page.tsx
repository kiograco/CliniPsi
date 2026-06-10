import Image from 'next/image';
import Link from 'next/link';
import { searchPsychologists } from '@/services/psychologists';

type PsychologistsSearchPageProps = {
  searchParams: Promise<{
    city?: string;
    state?: string;
    modality?: 'ONLINE' | 'IN_PERSON';
    minPrice?: string;
    maxPrice?: string;
    specialtySlug?: string;
    approachSlug?: string;
    page?: string;
  }>;
};

export default async function PsychologistsSearchPage({
  searchParams
}: PsychologistsSearchPageProps) {
  const params = await searchParams;
  const results = await searchPsychologists(params);

  return (
    <main className="page-shell">
      <section className="search-page">
        <header className="search-header">
          <h1>Psicologos</h1>
          <p>{results.meta.total} profissionais encontrados</p>
        </header>

        <form className="search-form search-form-wide">
          <input name="city" placeholder="Cidade" defaultValue={params.city} />
          <input
            name="state"
            placeholder="UF"
            maxLength={2}
            defaultValue={params.state}
          />
          <select name="modality" defaultValue={params.modality ?? ''}>
            <option value="">Modalidade</option>
            <option value="ONLINE">Online</option>
            <option value="IN_PERSON">Presencial</option>
          </select>
          <input
            name="minPrice"
            placeholder="Preco minimo"
            inputMode="decimal"
            defaultValue={params.minPrice}
          />
          <input
            name="maxPrice"
            placeholder="Preco maximo"
            inputMode="decimal"
            defaultValue={params.maxPrice}
          />
          <button className="button button-primary" type="submit">
            Filtrar
          </button>
        </form>

        <div className="result-grid">
          {results.data.map((profile) => {
            const location = [profile.city, profile.state]
              .filter(Boolean)
              .join(' - ');

            return (
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
                  <p>{location || 'Atendimento online'}</p>
                  <p>
                    R$ {profile.consultationPrice.toFixed(2).replace('.', ',')}{' '}
                    · {profile.consultationDurationMinutes} min
                  </p>
                  <div className="tag-list">
                    {profile.specialties.slice(0, 3).map((specialty) => (
                      <span className="tag" key={specialty.id}>
                        {specialty.name}
                      </span>
                    ))}
                  </div>
                  <Link
                    className="button button-secondary"
                    href={`/psicologos/${profile.slug}`}
                  >
                    Ver perfil
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
