import Link from 'next/link';

export default function PanelHomePage() {
  return (
    <section className="panel-page">
      <h1>Painel</h1>
      <p>Escolha a area correspondente ao perfil autenticado.</p>
      <div className="panel-actions">
        <Link className="button button-secondary" href="/painel/paciente">
          Paciente
        </Link>
        <Link className="button button-secondary" href="/painel/psicologo">
          Psicologo
        </Link>
        <Link className="button button-secondary" href="/painel/admin">
          Admin
        </Link>
      </div>
    </section>
  );
}
