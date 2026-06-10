export default function PsychologistPanelPage() {
  return (
    <section className="panel-page">
      <h1>Painel do psicologo</h1>
      <div className="panel-grid">
        <article className="panel-block">
          <h2>Perfil</h2>
          <p>Dados profissionais cadastrados em `/psychologists/me`.</p>
        </article>
        <article className="panel-block">
          <h2>Agenda</h2>
          <p>Disponibilidades, bloqueios e consultas em `/schedule` e `/appointments/psychologist`.</p>
        </article>
      </div>
    </section>
  );
}
