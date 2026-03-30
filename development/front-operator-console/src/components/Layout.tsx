import { NavLink, Outlet } from 'react-router-dom';

import type { AccountSummary } from '../types';
import { formatRoleLabel } from '../uiLabels';

type LayoutProps = {
  account: AccountSummary;
  onLogout: () => void | Promise<void>;
};

export function Layout({ account, onLogout }: LayoutProps) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="brand-kicker">CLEVER Local MSA</p>
          <h1 className="brand-title">운영 콘솔</h1>
        </div>
        <nav className="nav-links">
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/">
            대시보드
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/drivers">
            배송원
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/vehicles">
            차량
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to="/settlements"
          >
            정산
          </NavLink>
        </nav>
        <div className="account-card">
          <div>
            <p className="account-email">{account.email}</p>
            <p className="account-role">{formatRoleLabel(account.role)}</p>
          </div>
          <button className="button ghost" onClick={() => void onLogout()} type="button">
            로그아웃
          </button>
        </div>
      </header>
      <main className="page-body">
        <Outlet />
      </main>
    </div>
  );
}
