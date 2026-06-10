import { AuthForm } from '@/features/auth/auth-form';

export default function RegisterPage() {
  return (
    <main className="page-shell">
      <section className="auth-page">
        <h1>Criar conta</h1>
        <AuthForm mode="register" />
      </section>
    </main>
  );
}
