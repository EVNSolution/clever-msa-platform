import { NavLink, Outlet } from 'react-router-dom';

import type { AccountSummary } from '../types';

type LayoutProps = {
  account: AccountSummary;
  onLogout: () => void | Promise<void>;
};

export function Layout({ account, onLogout }: LayoutProps) {
  return (
    <div className="page-shell admin-shell">
      <header className="topbar admin-topbar">
        <div>
          <p className="brand-kicker">CLEVER Control</p>
          <h1 className="brand-title">Admin Console</h1>
        </div>
        <nav className="nav-links admin-nav">
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/accounts">
            Accounts
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/organization">
            Organization
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/drivers">
            Drivers
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/vehicles">
            Vehicles
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/terminals">
            Terminals
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/vehicle-assignments">
            Vehicle Assignments
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/settlements">
            Settlements
          </NavLink>
        </nav>
        <div className="account-card admin-account-card">
          <div>
            <p className="account-email">{account.email}</p>
            <p className="account-role">{account.role}</p>
          </div>
          <button className="button ghost" onClick={() => void onLogout()} type="button">
            Sign out
          </button>
        </div>
      </header>
      <main className="page-body">
        <Outlet />
      </main>
    </div>
  );
}
