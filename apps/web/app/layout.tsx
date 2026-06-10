import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { env } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: 'DivulgaPsi',
  description: 'Plataforma para busca e agendamento com psicologos.',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'DivulgaPsi',
    description: 'Encontre psicologos e agende consultas online ou presenciais.',
    url: '/',
    siteName: 'DivulgaPsi',
    locale: 'pt_BR',
    type: 'website'
  }
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
