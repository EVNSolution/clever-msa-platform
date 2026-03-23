import { useState, type FormEvent } from 'react';

type LoginPageProps = {
  errorMessage?: string | null;
  isSubmitting: boolean;
  onLogin: (credentials: { email: string; password: string }) => void | Promise<void>;
};

export function LoginPage({ errorMessage, isSubmitting, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLogin({ email, password });
  }

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">Local Bootstrap</p>
        <h1>Gateway-only front for account, organization, driver, and settlement flows.</h1>
        <p className="hero-copy">
          This app only talks to <code>/api</code> through the gateway and relies on refresh-cookie based
          session renewal.
        </p>
      </section>
      <section className="auth-panel panel">
        <div className="panel-header">
          <p className="panel-kicker">Sign In</p>
          <h2>Use the seeded admin account or any registered user.</h2>
        </div>
        <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              type="email"
              value={email}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="change-me"
              type="password"
              value={password}
            />
          </label>
          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
          <button
            className="button primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </div>
  );
}
