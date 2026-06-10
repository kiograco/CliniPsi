export default function PatientPanelPage() {
  return (
    <section className="panel-page">
      <h1>Painel do paciente</h1>
      <div className="panel-grid">
        <article className="panel-block">
          <h2>Consultas</h2>
          <p>As consultas criadas em `/appointments/me` serao exibidas aqui.</p>
        </article>
        <article className="panel-block">
          <h2>Proximos horarios</h2>
          <p>O agendamento usa os slots de `/schedule/psychologists/:id/available-slots`.</p>
        </article>
      </div>
    </section>
  );
}
