import { NavLink, Outlet } from 'react-router-dom';

import type { SessionPayload } from '../api/http';
import { formatRoleLabel } from '../uiLabels';

type LayoutProps = {
  session: SessionPayload;
  onLogout: () => void | Promise<void>;
};

export function Layout({ session, onLogout }: LayoutProps) {
  return (
    <div className="page-shell admin-shell">
      <header className="topbar admin-topbar">
        <div>
          <p className="brand-kicker">CLEVER 관리</p>
          <h1 className="brand-title">관리자 콘솔</h1>
        </div>
        <nav className="nav-links admin-nav">
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/accounts">
            계정 요청
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
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/vehicle-assignments">
            차량 배정
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/settlements">
            정산
          </NavLink>
        </nav>
        <div className="account-card admin-account-card">
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
