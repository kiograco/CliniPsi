'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BRAZIL_STATE_OPTIONS } from '@/lib/brazil-states';
import { apiRequest, ApiError } from '@/services/api-client';
import { useAuthSession } from '@/hooks/use-auth-session';
import type {
  Appointment,
  AppointmentStatus,
  Availability,
  PsychologistProfile
} from '@/types/mvp';
import type { PublicTaxonomyItem } from '@/types/psychologist';

const weekdays = [
  'Domingo',
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado'
];

type ProfileFormState = {
  professionalName: string;
  crp: string;
  photoUrl: string;
  bio: string;
  consultationPrice: string;
  consultationDurationMinutes: string;
  offersOnline: boolean;
  offersInPerson: boolean;
  city: string;
  state: string;
  address: string;
  whatsapp: string;
  specialtyIds: string[];
  approachIds: string[];
};

const emptyProfileForm: ProfileFormState = {
  professionalName: '',
  crp: '',
  photoUrl: '',
  bio: '',
  consultationPrice: '180',
  consultationDurationMinutes: '50',
  offersOnline: true,
  offersInPerson: false,
  city: '',
  state: '',
  address: '',
  whatsapp: '',
  specialtyIds: [],
  approachIds: []
};

export function PsychologistPanel() {
  const router = useRouter();
  const { ready, session, logout } = useAuthSession();
  const [profile, setProfile] = useState<PsychologistProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(emptyProfileForm);
  const [specialties, setSpecialties] = useState<PublicTaxonomyItem[]>([]);
  const [approaches, setApproaches] = useState<PublicTaxonomyItem[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = session?.accessToken;

  const canManage = ready && session?.user.role === 'PSYCHOLOGIST';

  useEffect(() => {
    async function load() {
      if (ready && (!session || session.user.role !== 'PSYCHOLOGIST')) {
        router.replace('/painel');
        return;
      }

      if (!token || session?.user.role !== 'PSYCHOLOGIST') {
        return;
      }

      setError(null);

      try {
        const [specialtyItems, approachItems] = await Promise.all([
          apiRequest<PublicTaxonomyItem[]>('/search/specialties'),
          apiRequest<PublicTaxonomyItem[]>('/search/approaches')
        ]);
        setSpecialties(specialtyItems);
        setApproaches(approachItems);

        let currentProfile: PsychologistProfile | null = null;

        try {
          currentProfile = await apiRequest<PsychologistProfile>(
            '/psychologists/me',
            {
              token
            }
          );
          setProfile(currentProfile);
          setForm(profileToForm(currentProfile));
        } catch (caught) {
          if (!(caught instanceof ApiError) || caught.status !== 404) {
            throw caught;
          }
        } finally {
          setProfileLoaded(true);
        }

        if (currentProfile) {
          await Promise.all([loadAvailability(token), loadAppointments(token)]);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Falha ao carregar painel.');
      }
    }

    void load();
  }, [ready, router, session, session?.user.role, token]);

  async function loadAvailability(currentToken = token) {
    if (!currentToken) {
      return;
    }

    const items = await apiRequest<Availability[]>('/schedule/availability', {
      token: currentToken
    });
    setAvailabilities(items);
  }

  async function loadAppointments(currentToken = token) {
    if (!currentToken) {
      return;
    }

    const items = await apiRequest<Appointment[]>('/appointments/psychologist', {
      token: currentToken
    });
    setAppointments(items);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const payload = {
        professionalName: form.professionalName,
        crp: form.crp,
        photoUrl: form.photoUrl || undefined,
        bio: form.bio,
        consultationPrice: Number(form.consultationPrice),
        consultationDurationMinutes: Number(form.consultationDurationMinutes),
        offersOnline: form.offersOnline,
        offersInPerson: form.offersInPerson,
        city: form.city || undefined,
        state: form.state || undefined,
        address: form.address || undefined,
        whatsapp: form.whatsapp || undefined,
        specialtyIds: form.specialtyIds,
        approachIds: form.approachIds
      };

      const saved = await apiRequest<PsychologistProfile>(
        profile ? '/psychologists/me' : '/psychologists/profile',
        {
          method: profile ? 'PATCH' : 'POST',
          token,
          body: JSON.stringify(payload)
        }
      );

      setProfile(saved);
      setForm(profileToForm(saved));
      setMessage('Perfil salvo e enviado para aprovacao.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao salvar perfil.');
    }
  }

  async function createAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    if (!profile) {
      setError('Cadastre e salve o perfil profissional antes de criar a agenda.');
      return;
    }

    const formElement = event.currentTarget;
    const data = new FormData(event.currentTarget);
    setError(null);
    setMessage(null);

    try {
      await apiRequest<Availability>('/schedule/availability', {
        method: 'POST',
        token,
        body: JSON.stringify({
          weekday: Number(data.get('weekday')),
          startTime: String(data.get('startTime')),
          endTime: String(data.get('endTime')),
          active: true
        })
      });
      formElement.reset();
      await loadAvailability();
      setMessage('Disponibilidade adicionada.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao salvar agenda.');
    }
  }

  async function removeAvailability(id: string) {
    if (!token) {
      return;
    }

    try {
      await apiRequest<{ success: true }>(`/schedule/availability/${id}`, {
        method: 'DELETE',
        token
      });
      await loadAvailability();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao remover horario.');
    }
  }

  async function updateAppointment(id: string, status: AppointmentStatus) {
    if (!token) {
      return;
    }

    try {
      await apiRequest<Appointment>(`/appointments/${id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status })
      });
      await loadAppointments();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao alterar consulta.');
    }
  }

  const profileStatus = useMemo(() => {
    if (!profile) {
      return 'Perfil ainda nao cadastrado.';
    }

    return `Status: ${profile.approvalStatus}`;
  }, [profile]);

  if (!ready) {
    return <p className="muted-text">Carregando sessao...</p>;
  }

  if (!canManage) {
    return (
      <section className="panel-page">
        <h1>Painel do psicologo</h1>
        <p className="muted-text">Redirecionando...</p>
      </section>
    );
  }

  return (
    <section className="panel-page">
      <div className="panel-header-row">
        <div>
          <h1>Painel do psicologo</h1>
          <p className="muted-text">{profileLoaded ? profileStatus : 'Carregando perfil...'}</p>
        </div>
        <button className="button button-secondary" onClick={logout} type="button">
          Sair
        </button>
      </div>

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="panel-grid">
        <article className="panel-block">
          <h2>Perfil profissional</h2>
          <form className="stack-form" onSubmit={saveProfile}>
            <label>
              Nome profissional
              <input
                value={form.professionalName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    professionalName: event.target.value
                  }))
                }
                required
              />
            </label>
            <label>
              CRP
              <input
                placeholder="CRP 06/123456"
                value={form.crp}
                onChange={(event) =>
                  setForm((current) => ({ ...current, crp: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Foto URL
              <input
                value={form.photoUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, photoUrl: event.target.value }))
                }
              />
            </label>
            <label>
              Bio
              <textarea
                minLength={80}
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bio: event.target.value }))
                }
                required
              />
            </label>
            <div className="form-row">
              <label>
                Valor
                <input
                  inputMode="decimal"
                  value={form.consultationPrice}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      consultationPrice: event.target.value
                    }))
                  }
                  required
                />
              </label>
              <label>
                Duracao
                <input
                  inputMode="numeric"
                  value={form.consultationDurationMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      consultationDurationMinutes: event.target.value
                    }))
                  }
                  required
                />
              </label>
            </div>
            <div className="check-row">
              <label>
                <input
                  checked={form.offersOnline}
                  type="checkbox"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      offersOnline: event.target.checked
                    }))
                  }
                />
                Online
              </label>
              <label>
                <input
                  checked={form.offersInPerson}
                  type="checkbox"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      offersInPerson: event.target.checked
                    }))
                  }
                />
                Presencial
              </label>
            </div>
            <div className="form-row">
              <label>
                Cidade
                <input
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, city: event.target.value }))
                  }
                />
              </label>
              <label>
                UF
                <select
                  value={form.state}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, state: event.target.value }))
                  }
                >
                  <option value="">UF</option>
                  {BRAZIL_STATE_OPTIONS.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Endereco
              <input
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
              />
            </label>
            <label>
              WhatsApp
              <input
                value={form.whatsapp}
                onChange={(event) =>
                  setForm((current) => ({ ...current, whatsapp: event.target.value }))
                }
              />
            </label>
            <TaxonomyChecklist
              items={specialties}
              label="Especialidades"
              selected={form.specialtyIds}
              onChange={(specialtyIds) =>
                setForm((current) => ({ ...current, specialtyIds }))
              }
            />
            <TaxonomyChecklist
              items={approaches}
              label="Abordagens"
              selected={form.approachIds}
              onChange={(approachIds) =>
                setForm((current) => ({ ...current, approachIds }))
              }
            />
            <button className="button button-primary" type="submit">
              Salvar perfil
            </button>
          </form>
        </article>

        <article className="panel-block">
          <h2>Agenda semanal</h2>
          {profile ? (
            <>
              <form className="stack-form compact-form" onSubmit={createAvailability}>
                <label>
                  Dia
                  <select name="weekday" defaultValue="1">
                    {weekdays.map((weekday, index) => (
                      <option key={weekday} value={index}>
                        {weekday}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-row">
                  <label>
                    Inicio
                    <input name="startTime" type="time" required />
                  </label>
                  <label>
                    Fim
                    <input name="endTime" type="time" required />
                  </label>
                </div>
                <button className="button button-primary" type="submit">
                  Adicionar horario
                </button>
              </form>

              <div className="list-stack">
                {availabilities.map((availability) => (
                  <div className="list-item" key={availability.id}>
                    <span>
                      {weekdays[availability.weekday]} {availability.startTime}-
                      {availability.endTime}
                    </span>
                    <button
                      className="button button-secondary"
                      onClick={() => void removeAvailability(availability.id)}
                      type="button"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted-text">
              Cadastre e salve o perfil profissional antes de criar horarios.
            </p>
          )}
        </article>
      </div>

      {profile ? (
        <article className="panel-block full-row">
          <h2>Consultas</h2>
          <div className="list-stack">
            {appointments.map((appointment) => (
              <div className="list-item" key={appointment.id}>
                <span>
                  {new Date(appointment.startAt).toLocaleString('pt-BR')} -{' '}
                  {appointment.patient.name} - {appointment.status}
                </span>
                <div className="inline-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => void updateAppointment(appointment.id, 'CONFIRMED')}
                    type="button"
                  >
                    Confirmar
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => void updateAppointment(appointment.id, 'COMPLETED')}
                    type="button"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ))}
            {!appointments.length ? <p className="muted-text">Nenhuma consulta.</p> : null}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function TaxonomyChecklist({
  items,
  label,
  selected,
  onChange
}: {
  items: PublicTaxonomyItem[];
  label: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="check-fieldset taxonomy-fieldset">
      <legend>{label}</legend>
      {items.map((item) => (
        <label key={item.id}>
          <input
            checked={selected.includes(item.id)}
            type="checkbox"
            onChange={(event) => {
              onChange(
                event.target.checked
                  ? [...selected, item.id]
                  : selected.filter((id) => id !== item.id)
              );
            }}
          />
          {item.name}
        </label>
      ))}
      {!items.length ? <p className="muted-text">Cadastre itens no admin.</p> : null}
    </fieldset>
  );
}

function profileToForm(profile: PsychologistProfile): ProfileFormState {
  return {
    professionalName: profile.professionalName,
    crp: profile.crp,
    photoUrl: profile.photoUrl ?? '',
    bio: profile.bio,
    consultationPrice: String(profile.consultationPrice),
    consultationDurationMinutes: String(profile.consultationDurationMinutes),
    offersOnline: profile.offersOnline,
    offersInPerson: profile.offersInPerson,
    city: profile.city ?? '',
    state: profile.state ?? '',
    address: profile.address ?? '',
    whatsapp: profile.whatsapp ?? '',
    specialtyIds: profile.specialties.map((item) => item.id),
    approachIds: profile.approaches.map((item) => item.id)
  };
}
