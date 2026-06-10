'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthSession } from '@/hooks/use-auth-session';

export function PanelRouter() {
  const router = useRouter();
  const { ready, session } = useAuthSession();

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session) {
      router.replace('/auth/login');
      return;
    }

    if (session.user.role === 'ADMIN') {
      router.replace('/painel/admin');
      return;
    }

    if (session.user.role === 'PSYCHOLOGIST') {
      router.replace('/painel/psicologo');
      return;
    }

    router.replace('/painel/paciente');
  }, [ready, router, session]);

  return (
    <section className="panel-page">
      <p className="muted-text">Carregando painel...</p>
    </section>
  );
}
