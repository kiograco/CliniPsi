'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/services/api-client';
import { useAuthSession } from '@/hooks/use-auth-session';
import type { Appointment } from '@/types/mvp';

export function PatientPanel() {
  const router = useRouter();
  const { ready, session, logout } = useAuthSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const token = session?.accessToken;

  useEffect(() => {
    if (ready && (!session || session.user.role !== 'PATIENT')) {
      router.replace('/painel');
      return;
    }

    if (!token || session?.user.role !== 'PATIENT') {
      return;
    }

    void loadAppointments(token);
  }, [ready, router, session, session?.user.role, token]);

  async function loadAppointments(currentToken = token) {
    if (!currentToken) {
      return;
    }

    try {
      setError(null);
      const items = await apiRequest<Appointment[]>('/appointments/me', {
        token: currentToken
      });
      setAppointments(items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao carregar consultas.');
    }
  }

  async function cancel(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!token) {
      return;
    }

    const data = new FormData(event.currentTarget);

    try {
      await apiRequest<Appointment>(`/appointments/${id}/cancel`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          reason: String(data.get('reason') ?? '')
        })
      });
      await loadAppointments();
      setMessage('Consulta cancelada.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao cancelar.');
    }
  }

  if (!ready) {
    return (
      <section className="panel-page">
        <p className="muted-text">Carregando sessao...</p>
      </section>
    );
  }

  if (session?.user.role !== 'PATIENT') {
    return (
      <section className="panel-page">
        <h1>Painel do paciente</h1>
        <p className="muted-text">Redirecionando...</p>
      </section>
    );
  }

  return (
    <section className="panel-page">
      <div className="panel-header-row">
        <div>
          <h1>Painel do paciente</h1>
          <p className="muted-text">Consultas agendadas e historico.</p>
        </div>
        <button className="button button-secondary" onClick={logout} type="button">
          Sair
        </button>
      </div>

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="list-stack">
        {appointments.map((appointment) => (
          <article className="list-item appointment-item" key={appointment.id}>
            <div>
              <strong>{appointment.psychologist.professionalName}</strong>
              <p>
                {new Date(appointment.startAt).toLocaleString('pt-BR')} -{' '}
                {appointment.modality === 'ONLINE' ? 'Online' : 'Presencial'} -{' '}
                {appointment.status}
              </p>
              <Link href={`/psicologos/${appointment.psychologist.slug}`}>
                Ver perfil
              </Link>
            </div>
            {appointment.status !== 'CANCELED' &&
            appointment.status !== 'COMPLETED' ? (
              <form className="compact-form" onSubmit={(event) => void cancel(event, appointment.id)}>
                <input name="reason" placeholder="Motivo opcional" />
                <button className="button button-secondary" type="submit">
                  Cancelar
                </button>
              </form>
            ) : null}
          </article>
        ))}
        {!appointments.length ? (
          <p className="muted-text">Nenhuma consulta. Busque um psicologo para agendar.</p>
        ) : null}
      </div>
    </section>
  );
}
