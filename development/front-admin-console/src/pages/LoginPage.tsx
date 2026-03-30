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
        <p className="eyebrow">관리자 화면</p>
        <h1>계정, 조직, 배송원, 정산 도메인을 직접 관리하는 관리자 콘솔입니다.</h1>
        <p className="hero-copy">
          모든 요청은 게이트웨이를 거치며, Refresh 토큰은 <code>HttpOnly</code> 쿠키로 유지됩니다.
        </p>
      </section>
      <section className="auth-panel panel">
        <div className="panel-header">
          <p className="panel-kicker">관리자 로그인</p>
          <h2>시드 관리자 계정으로 로그인할 수 있습니다.</h2>
        </div>
        <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            <span>이메일</span>
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
            <span>비밀번호</span>
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
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </section>
    </div>
  );
}
