import { BRAZIL_STATE_OPTIONS } from '@/lib/brazil-states';

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="market-hero">
        <nav className="market-nav">
          <a className="brand-mark" href="/">
            <span className="brand-symbol">D</span>
            DivulgaPsi
          </a>
          <div className="nav-actions">
            <a href="/auth/login">Entrar</a>
            <a className="professional-cta" href="/auth/cadastro-psicologo">
              Voce atua na area da saude?
            </a>
          </div>
        </nav>

        <div className="hero-search-panel">
          <h1>Encontre psicologos e agende online</h1>
          <p>Busque por cidade, estado e modalidade de atendimento.</p>
          <form action="/psicologos" className="market-search-form">
            <input name="city" placeholder="Cidade" />
            <select name="state" defaultValue="">
              <option value="">Estado</option>
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
        </div>
      </section>
    </main>
  );
}
