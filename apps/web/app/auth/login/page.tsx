import { AuthForm } from '@/features/auth/auth-form';

export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="auth-page">
        <h1>Entrar</h1>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
