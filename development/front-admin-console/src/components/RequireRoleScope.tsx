import type { ReactNode } from 'react';

import type { SessionPayload } from '../api/http';

type RequireRoleScopeProps = {
  session: SessionPayload;
  onLogout: () => void | Promise<void>;
  title: string;
  message: string;
  when: (session: SessionPayload) => boolean;
  children: ReactNode;
};

export function RequireRoleScope({ session, onLogout, title, message, when, children }: RequireRoleScopeProps) {
  if (when(session)) {
    return <>{children}</>;
  }

  return (
    <div className="auth-shell admin-auth-shell">
      <section className="auth-panel panel blocked-panel">
        <p className="panel-kicker">권한 범위</p>
        <h2>{title}</h2>
        <p className="hero-copy">{message}</p>
        <button className="button primary" onClick={() => void onLogout()} type="button">
          로그인 화면으로
        </button>
      </section>
    </div>
  );
}
