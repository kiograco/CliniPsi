import type { ReactNode } from 'react';

type PanelLayoutProps = {
  children: ReactNode;
};

export default function PanelLayout({ children }: PanelLayoutProps) {
  return <main className="page-shell">{children}</main>;
}
