import { NavLink, Outlet } from 'react-router-dom';

import type { AccountSummary } from '../types';
import { formatRoleLabel } from '../uiLabels';

type LayoutProps = {
  account: AccountSummary;
  onLogout: () => void | Promise<void>;
};

export function Layout({ account, onLogout }: LayoutProps) {
  return (
    <div className="page-shell admin-shell">
      <header className="topbar admin-topbar">
        <div>
          <p className="brand-kicker">CLEVER 관리</p>
          <h1 className="brand-title">관리자 콘솔</h1>
        </div>
        <nav className="nav-links admin-nav">
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/accounts">
            계정
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/companies">
            회사
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/drivers">
            배송원
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/vehicles">
            차량
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/terminals">
            단말기
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/vehicle-assignments">
            차량 배정
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/settlements">
            정산
          </NavLink>
        </nav>
        <div className="account-card admin-account-card">
          <div className="account-meta">
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
