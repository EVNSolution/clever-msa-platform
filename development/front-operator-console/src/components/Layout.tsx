import { NavLink, Outlet } from 'react-router-dom';

import type { AccountSummary } from '../types';

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
          <h1 className="brand-title">Operations Front</h1>
        </div>
        <nav className="nav-links">
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/">
            Dashboard
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/drivers">
            Drivers
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/vehicles">
            Vehicles
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to="/settlements"
          >
            Settlements
          </NavLink>
        </nav>
        <div className="account-card">
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
