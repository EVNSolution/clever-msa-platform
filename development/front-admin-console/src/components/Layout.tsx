import { NavLink, Outlet } from 'react-router-dom';

import type { SessionPayload } from '../api/http';
import {
  canAccessAccountsScope,
  canAccessCompanyScope,
  canAccessDispatchScope,
  canAccessDriverScope,
  canAccessPersonnelDocumentScope,
  canAccessRegionScope,
  canAccessSettlementScope,
  canAccessVehicleScope,
} from '../authScopes';
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
          <p className="brand-kicker">CLEVER 운영</p>
          <h1 className="brand-title">통합 콘솔</h1>
        </div>
        <nav className="nav-links admin-nav">
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/">
            대시보드
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/account">
            내 계정
          </NavLink>
          {canAccessAccountsScope(session) ? (
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/accounts">
              계정 요청
            </NavLink>
          ) : null}
          {canAccessAccountsScope(session) ? (
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/announcements">
              공지
            </NavLink>
          ) : null}
          {canAccessAccountsScope(session) ? (
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/support">
              지원
            </NavLink>
          ) : null}
          {canAccessAccountsScope(session) ? (
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/notifications">
              알림
            </NavLink>
          ) : null}
          {canAccessCompanyScope(session) ? (
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/companies">
              회사
            </NavLink>
          ) : null}
          {canAccessRegionScope(session) ? (
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/regions">
              권역
            </NavLink>
          ) : null}
          {canAccessDriverScope(session) ? (
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/drivers">
              배송원
            </NavLink>
          ) : null}
          {canAccessPersonnelDocumentScope(session) ? (
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/personnel-documents">
              인사문서
            </NavLink>
          ) : null}
          {canAccessVehicleScope(session) ? (
            <>
              <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/vehicles">
                차량
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/vehicle-assignments">
                차량 배정
              </NavLink>
            </>
          ) : null}
          {canAccessSettlementScope(session) ? (
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/settlements">
              정산
            </NavLink>
          ) : null}
          {canAccessDispatchScope(session) ? (
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/dispatch/boards">
              배차
            </NavLink>
          ) : null}
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
