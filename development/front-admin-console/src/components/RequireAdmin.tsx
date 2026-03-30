import type { ReactNode } from 'react';

import type { AccountSummary } from '../types';

type RequireAdminProps = {
  account: AccountSummary;
  onLogout: () => void | Promise<void>;
  children: ReactNode;
};

export function RequireAdmin({ account, onLogout, children }: RequireAdminProps) {
  if (account.role === 'admin') {
    return <>{children}</>;
  }

  return (
    <div className="auth-shell admin-auth-shell">
      <section className="auth-panel panel blocked-panel">
        <p className="panel-kicker">접근 제어</p>
        <h2>관리자 권한 필요</h2>
        <p className="hero-copy">
          이 콘솔은 <strong>admin</strong> 권한 계정만 사용할 수 있습니다. 로그아웃 후 관리자 계정으로 다시 로그인하세요.
        </p>
        <button className="button primary" onClick={() => void onLogout()} type="button">
          로그인 화면으로
        </button>
      </section>
    </div>
  );
}
