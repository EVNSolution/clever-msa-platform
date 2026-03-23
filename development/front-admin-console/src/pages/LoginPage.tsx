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
    <div className="auth-shell admin-auth-shell">
      <section className="auth-hero admin-hero">
        <p className="eyebrow">Admin Surface</p>
        <h1>Write-enabled console for account, organization, driver, and settlement domains.</h1>
        <p className="hero-copy">
          All actions still route through the gateway. Refresh tokens stay in <code>HttpOnly</code> cookies.
        </p>
      </section>
      <section className="auth-panel panel">
        <div className="panel-header">
          <p className="panel-kicker">Admin Sign In</p>
          <h2>Seeded admin credentials are accepted here.</h2>
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
