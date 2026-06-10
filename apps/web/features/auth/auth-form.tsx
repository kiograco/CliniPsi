'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiRequest } from '@/services/api-client';
import type { AuthResponse, UserRole } from '@/types/mvp';
import { useAuthSession } from '@/hooks/use-auth-session';

type AuthFormProps = {
  mode: 'login' | 'register';
  defaultRole?: Exclude<UserRole, 'ADMIN'>;
};

export function AuthForm({ mode, defaultRole = 'PATIENT' }: AuthFormProps) {
  const router = useRouter();
  const { setSession } = useAuthSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const role = String(formData.get('role') ?? defaultRole) as Exclude<
      UserRole,
      'ADMIN'
    >;

    try {
      const payload =
        mode === 'login'
          ? {
              email: String(formData.get('email') ?? ''),
              password: String(formData.get('password') ?? '')
            }
          : {
              name: String(formData.get('name') ?? ''),
              email: String(formData.get('email') ?? ''),
              password: String(formData.get('password') ?? ''),
              role
            };

      const session = await apiRequest<AuthResponse>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );

      setSession(session);
      router.push('/painel');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      {mode === 'register' ? (
        <>
          <label>
            Nome
            <input name="name" minLength={2} maxLength={120} required />
          </label>
          <label>
            Tipo de conta
            <select name="role" defaultValue={defaultRole}>
              <option value="PATIENT">Paciente</option>
              <option value="PSYCHOLOGIST">Psicologo</option>
            </select>
          </label>
        </>
      ) : null}

      <label>
        E-mail
        <input name="email" type="email" maxLength={255} required />
      </label>
      <label>
        Senha
        <input name="password" type="password" minLength={8} maxLength={72} required />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="button button-primary" disabled={loading} type="submit">
        {loading ? 'Enviando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
      </button>

      <p className="muted-text">
        {mode === 'login' ? (
          <>
            Ainda nao tem conta? <Link href="/auth/cadastro">Cadastre-se</Link>
          </>
        ) : (
          <>
            Ja tem conta? <Link href="/auth/login">Entrar</Link>
          </>
        )}
      </p>
    </form>
  );
}
