'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/services/api-client';
import { useAuthSession } from '@/hooks/use-auth-session';
import type { PsychologistProfile } from '@/types/mvp';

export function AdminPanel() {
  const router = useRouter();
  const { ready, session, logout } = useAuthSession();
  const [pending, setPending] = useState<PsychologistProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const token = session?.accessToken;

  useEffect(() => {
    if (ready && (!session || session.user.role !== 'ADMIN')) {
      router.replace('/painel');
      return;
    }

    if (!token || session?.user.role !== 'ADMIN') {
      return;
    }

    void loadPending(token);
  }, [ready, router, session, session?.user.role, token]);

  async function loadPending(currentToken = token) {
    if (!currentToken) {
      return;
    }

    try {
      setError(null);
      const items = await apiRequest<PsychologistProfile[]>(
        '/admin/psychologists/pending',
        {
          token: currentToken
        }
      );
      setPending(items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao carregar aprovacoes.');
    }
  }

  async function approve(id: string) {
    if (!token) {
      return;
    }

    try {
      await apiRequest<PsychologistProfile>(`/admin/psychologists/${id}/approve`, {
        method: 'PATCH',
        token
      });
      await loadPending();
      setMessage('Psicologo aprovado.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao aprovar.');
    }
  }

  async function reject(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!token) {
      return;
    }

    const data = new FormData(event.currentTarget);

    try {
      await apiRequest<PsychologistProfile>(`/admin/psychologists/${id}/reject`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          reason: String(data.get('reason') ?? '')
        })
      });
      await loadPending();
      setMessage('Psicologo rejeitado.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao rejeitar.');
    }
  }

  async function createTaxonomy(
    event: FormEvent<HTMLFormElement>,
    type: 'specialties' | 'approaches'
  ) {
    event.preventDefault();
    if (!token) {
      return;
    }

    const formElement = event.currentTarget;
    const data = new FormData(formElement);

    try {
      await apiRequest(`/admin/${type}`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          active: true
        })
      });
      formElement.reset();
      setMessage(type === 'specialties' ? 'Especialidade criada.' : 'Abordagem criada.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao criar item.');
    }
  }

  if (!ready) {
    return (
      <section className="panel-page">
        <p className="muted-text">Carregando sessao...</p>
      </section>
    );
  }

  if (session?.user.role !== 'ADMIN') {
    return (
      <section className="panel-page">
        <h1>Painel admin</h1>
        <p className="muted-text">Redirecionando...</p>
      </section>
    );
  }

  return (
    <section className="panel-page">
      <div className="panel-header-row">
        <div>
          <h1>Painel admin</h1>
          <p className="muted-text">Aprovacao de perfis profissionais.</p>
        </div>
        <button className="button button-secondary" onClick={logout} type="button">
          Sair
        </button>
      </div>

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="panel-grid">
        <article className="panel-block">
          <h2>Nova especialidade</h2>
          <form
            className="stack-form compact-form"
            onSubmit={(event) => void createTaxonomy(event, 'specialties')}
          >
            <label>
              Nome
              <input name="name" required />
            </label>
            <button className="button button-primary" type="submit">
              Criar especialidade
            </button>
          </form>
        </article>

        <article className="panel-block">
          <h2>Nova abordagem</h2>
          <form
            className="stack-form compact-form"
            onSubmit={(event) => void createTaxonomy(event, 'approaches')}
          >
            <label>
              Nome
              <input name="name" required />
            </label>
            <button className="button button-primary" type="submit">
              Criar abordagem
            </button>
          </form>
        </article>
      </div>

      <div className="list-stack">
        {pending.map((profile) => (
          <article className="approval-item" key={profile.id}>
            <div>
              <h2>{profile.professionalName}</h2>
              <p>
                {profile.crp} - {profile.city || 'Online'}
                {profile.state ? `/${profile.state}` : ''}
              </p>
              <p>{profile.bio}</p>
              <div className="tag-list">
                {profile.specialties.map((specialty) => (
                  <span className="tag" key={specialty.id}>
                    {specialty.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="approval-actions">
              <button
                className="button button-primary"
                onClick={() => void approve(profile.id)}
                type="button"
              >
                Aprovar
              </button>
              <form className="compact-form" onSubmit={(event) => void reject(event, profile.id)}>
                <input name="reason" placeholder="Motivo opcional" />
                <button className="button button-secondary" type="submit">
                  Rejeitar
                </button>
              </form>
            </div>
          </article>
        ))}
        {!pending.length ? <p className="muted-text">Nenhum perfil pendente.</p> : null}
      </div>
    </section>
  );
}
