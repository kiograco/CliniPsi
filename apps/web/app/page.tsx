import { BRAZIL_STATE_OPTIONS } from '@/lib/brazil-states';

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="home-search">
        <h1>DivulgaPsi</h1>
        <p>Encontre psicologos por cidade, modalidade e faixa de preco.</p>
        <form action="/psicologos" className="search-form">
          <input name="city" placeholder="Cidade" />
          <select name="state" defaultValue="">
            <option value="">UF</option>
            {BRAZIL_STATE_OPTIONS.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <select name="modality" defaultValue="">
            <option value="">Online e presencial</option>
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
