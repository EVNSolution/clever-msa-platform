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
        <p className="panel-kicker">Access Control</p>
        <h2>Admin access required</h2>
        <p className="hero-copy">
          This console only accepts accounts with the <strong>admin</strong> role. Sign out and use an admin account.
        </p>
        <button className="button primary" onClick={() => void onLogout()} type="button">
          Return to sign in
        </button>
      </section>
    </div>
  );
}
