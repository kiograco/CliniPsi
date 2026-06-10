'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiRequest } from '@/services/api-client';
import { useAuthSession } from '@/hooks/use-auth-session';
import type {
  Appointment,
  AppointmentModality,
  AvailableSlotsResponse
} from '@/types/mvp';

type BookingWidgetProps = {
  psychologistId: string;
  durationMinutes: number;
  offersOnline: boolean;
  offersInPerson: boolean;
};

export function BookingWidget({
  psychologistId,
  durationMinutes,
  offersOnline,
  offersInPerson
}: BookingWidgetProps) {
  const { ready, session } = useAuthSession();
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<AvailableSlotsResponse['slots']>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [modality, setModality] = useState<AppointmentModality | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSlots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSelectedSlot('');

    try {
      const response = await apiRequest<AvailableSlotsResponse>(
        `/schedule/psychologists/${psychologistId}/available-slots?date=${date}&durationMinutes=${durationMinutes}`
      );
      setSlots(response.slots);
      if (!response.slots.length) {
        setMessage('Nenhum horario livre para esta data.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao buscar horarios.');
    }
  }

  async function createAppointment() {
    if (!session?.accessToken) {
      setError('Entre como paciente para agendar.');
      return;
    }

    if (session.user.role !== 'PATIENT') {
      setError('Apenas pacientes podem agendar consultas.');
      return;
    }

    if (!selectedSlot || !modality) {
      setError('Selecione horario e modalidade.');
      return;
    }

    try {
      setError(null);
      await apiRequest<Appointment>('/appointments', {
        method: 'POST',
        token: session.accessToken,
        body: JSON.stringify({
          psychologistId,
          startAt: selectedSlot,
          modality
        })
      });
      setMessage('Consulta criada. Acompanhe no painel do paciente.');
      setSlots((current) => current.filter((slot) => slot.startAt !== selectedSlot));
      setSelectedSlot('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao agendar.');
    }
  }

  return (
    <div className="booking-widget">
      <form className="stack-form compact-form" onSubmit={loadSlots}>
        <label>
          Data
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>
        <button className="button button-primary" type="submit">
          Ver horarios
        </button>
      </form>

      {slots.length ? (
        <>
          <div className="slot-grid">
            {slots.map((slot) => (
              <button
                className={
                  selectedSlot === slot.startAt
                    ? 'slot-button slot-button-active'
                    : 'slot-button'
                }
                key={slot.startAt}
                onClick={() => setSelectedSlot(slot.startAt)}
                type="button"
              >
                {new Date(slot.startAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </button>
            ))}
          </div>

          <label className="field-label">
            Modalidade
            <select
              value={modality}
              onChange={(event) =>
                setModality(event.target.value as AppointmentModality | '')
              }
            >
              <option value="">Selecione</option>
              {offersOnline ? <option value="ONLINE">Online</option> : null}
              {offersInPerson ? <option value="IN_PERSON">Presencial</option> : null}
            </select>
          </label>

          <button className="button button-primary" onClick={() => void createAppointment()} type="button">
            Agendar consulta
          </button>
        </>
      ) : null}

      {ready && !session ? (
        <p className="muted-text">
          Para confirmar um horario, <Link href="/auth/login">entre como paciente</Link>.
        </p>
      ) : null}
      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
