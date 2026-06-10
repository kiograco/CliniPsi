import { AuthForm } from '@/features/auth/auth-form';

export default function PsychologistRegisterPage() {
  return (
    <main className="page-shell">
      <section className="auth-page">
        <h1>Cadastro de psicologo</h1>
        <AuthForm mode="register" defaultRole="PSYCHOLOGIST" />
      </section>
    </main>
  );
}
