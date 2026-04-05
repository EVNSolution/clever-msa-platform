import { NavLink, Outlet } from 'react-router-dom';

import type { SessionPayload } from '../api/http';
import { formatRoleLabel } from '../uiLabels';

type LayoutProps = {
  session: SessionPayload;
  onLogout: () => void | Promise<void>;
};

export function Layout({ session, onLogout }: LayoutProps) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="brand-kicker">CLEVER Local MSA</p>
          <h1 className="brand-title">운영 콘솔</h1>
        </div>
        <nav className="nav-links">
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/account">
            내 계정
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/">
            대시보드
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/announcements">
            공지
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/support">
            지원
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/notifications">
            알림
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
          <div className="account-meta">
            <p className="account-email">{session.email}</p>
            <p className="account-role">
              {formatRoleLabel(session.activeAccount?.roleType ?? session.activeAccount?.accountType)}
            </p>
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
