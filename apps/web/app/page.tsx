export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="home-search">
        <h1>DivulgaPsi</h1>
        <p>Encontre psicologos por cidade, modalidade e faixa de preco.</p>
        <form action="/psicologos" className="search-form">
          <input name="city" placeholder="Cidade" />
          <input name="state" placeholder="UF" maxLength={2} />
          <select name="modality" defaultValue="">
            <option value="">Modalidade</option>
            <option value="ONLINE">Online</option>
            <option value="IN_PERSON">Presencial</option>
          </select>
          <button className="button button-primary" type="submit">
            Buscar
          </button>
        </form>
      </section>
    </main>
  );
}
