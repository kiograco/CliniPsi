import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BRAZIL_STATE_OPTIONS } from '@/lib/brazil-states';
import { searchPsychologists } from '@/services/psychologists';

export const metadata: Metadata = {
  title: 'Psicologos | DivulgaPsi',
  description:
    'Busque psicologos por cidade, estado, modalidade, especialidade e faixa de preco.',
  alternates: {
    canonical: '/psicologos'
  }
};

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
  const titleLocation = [params.city, params.state].filter(Boolean).join(', ');
  const pageTitle = titleLocation
    ? `Psicologos, ${titleLocation}`
    : 'Psicologos';

  return (
    <main className="page-shell marketplace-page">
      <header className="market-topbar">
        <div className="market-topbar-inner">
          <Link className="brand-mark" href="/">
            <span className="brand-symbol">D</span>
            DivulgaPsi
          </Link>

          <form className="top-search-form">
            <select name="modality" defaultValue={params.modality ?? ''}>
              <option value="">Psicologo</option>
              <option value="ONLINE">Psicologo online</option>
              <option value="IN_PERSON">Psicologo presencial</option>
            </select>
            <input name="city" placeholder="Cidade" defaultValue={params.city} />
            <select name="state" defaultValue={params.state ?? ''}>
              <option value="">UF</option>
              {BRAZIL_STATE_OPTIONS.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <button type="submit" aria-label="Buscar">
              Buscar
            </button>
          </form>

          <div className="nav-actions">
            <Link href="/auth/login">Entrar</Link>
            <Link className="professional-cta" href="/auth/cadastro-psicologo">
              Voce atua na area da saude?
            </Link>
          </div>
        </div>
      </header>

      <section className="market-results-shell">
        <div className="market-results-main">
          <header className="market-results-heading">
            <h1>{pageTitle}</h1>
            <p>Agende online, sem custos adicionais.</p>
            <span>{results.meta.total} profissionais encontrados</span>
          </header>

          <form className="inline-filter-form">
            <input name="city" placeholder="Cidade" defaultValue={params.city} />
            <select name="state" defaultValue={params.state ?? ''}>
              <option value="">UF</option>
              {BRAZIL_STATE_OPTIONS.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <select name="modality" defaultValue={params.modality ?? ''}>
              <option value="">Online e presencial</option>
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

          <div className="doctor-list">
            {results.data.map((profile) => {
              const location = [profile.city, profile.state]
                .filter(Boolean)
                .join(' - ');
              const modalities = [
                profile.offersInPerson ? 'Endereco' : null,
                profile.offersOnline ? 'Teleconsulta' : null
              ].filter(Boolean);

              return (
                <article className="doctor-card doctor-card-clean" key={profile.id}>
                  <div className="doctor-info">
                    <div className="doctor-main-row">
                      <div className="doctor-photo">
                        {profile.photoUrl ? (
                          <Image
                            src={profile.photoUrl}
                            alt={profile.professionalName}
                            width={96}
                            height={96}
                            sizes="64px"
                            unoptimized
                          />
                        ) : (
                          <span>{profile.professionalName.charAt(0)}</span>
                        )}
                      </div>
                      <div className="doctor-copy">
                        <div className="doctor-badges">
                          {profile.offersOnline ? <span>Online</span> : null}
                        </div>
                        <h2>
                          <Link href={`/psicologos/${profile.slug}`}>
                            {profile.professionalName}
                          </Link>
                        </h2>
                        <p className="doctor-role">Psicologo - CRP {profile.crp}</p>
                      </div>
                    </div>

                    <div className="doctor-tags">
                      {profile.specialties.slice(0, 4).map((specialty) => (
                        <span className="tag" key={specialty.id}>
                          {specialty.name}
                        </span>
                      ))}
                    </div>

                    <div className="doctor-tabs">
                      {modalities.map((modality) => (
                        <span key={modality}>{modality}</span>
                      ))}
                    </div>

                    <div className="doctor-meta">
                      <p>{location || 'Atendimento online'}</p>
                      <p>
                        Consulta Psicologia
                        <strong>
                          R$ {profile.consultationPrice.toFixed(2).replace('.', ',')}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="booking-summary">
                    <h3>Agendamento online</h3>
                    <p>
                      Veja os horarios reais cadastrados pelo psicologo e confirme a
                      consulta pelo perfil.
                    </p>
                    <Link
                      className="button button-primary"
                      href={`/psicologos/${profile.slug}#agendar`}
                    >
                      Ver horarios
                    </Link>
                  </div>
                </article>
              );
            })}

            {!results.data.length ? (
              <div className="empty-results">
                <h2>Nenhum profissional encontrado</h2>
                <p>Tente remover filtros ou buscar por outro estado.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
