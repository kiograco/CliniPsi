export default function AdminPanelPage() {
  return (
    <section className="panel-page">
      <h1>Painel admin</h1>
      <div className="panel-grid">
        <article className="panel-block">
          <h2>Aprovacoes</h2>
          <p>Psicologos pendentes em `/admin/psychologists/pending`.</p>
        </article>
        <article className="panel-block">
          <h2>Gestao</h2>
          <p>Usuarios, especialidades, abordagens e consultas em `/admin`.</p>
        </article>
      </div>
    </section>
  );
}
