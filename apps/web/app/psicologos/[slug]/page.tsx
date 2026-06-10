import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getPublicPsychologistProfile } from '@/services/psychologists';

type PsychologistPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params
}: PsychologistPageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicPsychologistProfile(slug);

  if (!profile) {
    return {
      title: 'Psicologo nao encontrado | DivulgaPsi'
    };
  }

  return {
    title: `${profile.professionalName} | DivulgaPsi`,
    description: profile.bio.slice(0, 155)
  };
}

export default async function PsychologistPublicPage({
  params
}: PsychologistPageProps) {
  const { slug } = await params;
  const profile = await getPublicPsychologistProfile(slug);

  if (!profile) {
    notFound();
  }

  const location = [profile.city, profile.state].filter(Boolean).join(' - ');
  const modalities = [
    profile.offersOnline ? 'Online' : null,
    profile.offersInPerson ? 'Presencial' : null
  ]
    .filter(Boolean)
    .join(' e ');
  const whatsappUrl = profile.whatsapp
    ? `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`
    : null;

  return (
    <main className="page-shell">
      <section className="profile-hero">
        <div className="profile-photo" aria-label={profile.professionalName}>
          {profile.photoUrl ? (
            <Image
              src={profile.photoUrl}
              alt={profile.professionalName}
              width={720}
              height={900}
              sizes="(max-width: 800px) 100vw, 360px"
              unoptimized
            />
          ) : (
            <div className="profile-photo-fallback" aria-hidden="true">
              {profile.professionalName.charAt(0)}
            </div>
          )}
        </div>

        <div className="profile-content">
          <h1>{profile.professionalName}</h1>
          <p className="profile-crp">{profile.crp}</p>
          <p className="profile-bio">{profile.bio}</p>

          <div className="profile-actions">
            {whatsappUrl ? (
              <a className="button button-primary" href={whatsappUrl}>
                WhatsApp
              </a>
            ) : null}
            <a className="button button-secondary" href="#agendar">
              Agendar
            </a>
          </div>
        </div>
      </section>

      <section className="profile-details">
        <div className="detail-panel">
          <h2>Consulta</h2>
          <p>
            R$ {profile.consultationPrice.toFixed(2).replace('.', ',')} ·{' '}
            {profile.consultationDurationMinutes} minutos
          </p>
          <p>{modalities}</p>
        </div>

        <div className="detail-panel">
          <h2>Localizacao</h2>
          <p>{location || 'Atendimento online'}</p>
        </div>

        <div className="detail-panel">
          <h2>Especialidades</h2>
          <div className="tag-list">
            {profile.specialties.map((specialty) => (
              <span className="tag" key={specialty.id}>
                {specialty.name}
              </span>
            ))}
          </div>
        </div>

        <div className="detail-panel">
          <h2>Abordagens</h2>
          <div className="tag-list">
            {profile.approaches.map((approach) => (
              <span className="tag" key={approach.id}>
                {approach.name}
              </span>
            ))}
          </div>
        </div>

        <div className="detail-panel" id="agendar">
          <h2>Agendamento</h2>
          <p>Os horarios disponiveis serao exibidos na etapa de agenda.</p>
        </div>

        <div className="detail-panel reviews-panel">
          <h2>Avaliacoes</h2>
          {profile.reviews?.length ? (
            <div className="review-list">
              {profile.reviews.map((review) => (
                <article className="review-item" key={review.id}>
                  <strong>{review.rating}/5</strong>
                  <p>{review.comment}</p>
                  <span>{review.patient.name}</span>
                </article>
              ))}
            </div>
          ) : (
            <p>Ainda nao ha avaliacoes publicadas.</p>
          )}
        </div>
      </section>
    </main>
  );
}
