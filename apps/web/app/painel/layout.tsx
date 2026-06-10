import Link from 'next/link';
import type { ReactNode } from 'react';

type PanelLayoutProps = {
  children: ReactNode;
};

export default function PanelLayout({ children }: PanelLayoutProps) {
  return (
    <main className="page-shell">
      <nav className="panel-nav">
        <Link href="/painel/paciente">Paciente</Link>
        <Link href="/painel/psicologo">Psicologo</Link>
        <Link href="/painel/admin">Admin</Link>
      </nav>
      {children}
    </main>
  );
}
