import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import type { SessionPayload } from '../api/http';
import {
  accountItem,
  dashboardItem,
  isNavigationGroupActive,
  isNavigationItemActive,
  navigationGroups,
} from '../navigation';
import { formatRoleLabel } from '../uiLabels';

type LayoutProps = {
  session: SessionPayload;
  onLogout: () => void | Promise<void>;
};

function buildInitialExpansionState(session: SessionPayload) {
  return Object.fromEntries(
    navigationGroups.filter((group) => group.isVisible(session)).map((group) => [group.key, true]),
  );
}

export function Layout({ session, onLogout }: LayoutProps) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => buildInitialExpansionState(session));

  const visibleGroups = useMemo(
    () =>
      navigationGroups
        .filter((group) => group.isVisible(session))
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.isVisible(session)),
        })),
    [session],
  );

  useEffect(() => {
    setExpandedGroups((current) => {
      const next = { ...current };
      for (const group of visibleGroups) {
        if (!(group.key in next)) {
          next[group.key] = true;
        }
        if (isNavigationGroupActive(location.pathname, group)) {
          next[group.key] = true;
        }
      }
      return next;
    });
  }, [location.pathname, visibleGroups]);

  return (
    <div className="console-shell">
      <header className="console-topbar">
        <div className="console-brand-cluster">
          <button
            aria-label={drawerOpen ? '메뉴 닫기' : '메뉴 열기'}
            className="console-menu-button"
            onClick={() => setDrawerOpen((open) => !open)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <NavLink className="console-brand" to="/">
            <span className="console-brand-mark">EV&amp;Solution</span>
            <span className="console-brand-subtitle">CLEVER 통합 웹 콘솔</span>
          </NavLink>
        </div>
        <div className="console-topbar-actions">
          <NavLink className="console-account-link" to={accountItem.to}>
            내 계정
          </NavLink>
          <div className="console-account-summary">
            <div className="console-account-meta">
              <strong>{session.email}</strong>
              <span>{formatRoleLabel(session.activeAccount?.roleType ?? session.activeAccount?.accountType)}</span>
            </div>
            <button className="button ghost small" onClick={() => void onLogout()} type="button">
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <div className="console-frame">
        <aside className={drawerOpen ? 'console-drawer is-open' : 'console-drawer'}>
          <nav aria-label="주 메뉴" className="console-drawer-nav">
            <NavLink
              className={({ isActive }) => (isActive ? 'console-home-link is-active' : 'console-home-link')}
              end
              to={dashboardItem.to}
            >
              <span>{dashboardItem.label}</span>
            </NavLink>

            {visibleGroups.map((group) => {
              if (group.displayMode === 'link' && group.items.length === 1) {
                const item = group.items[0];
                const isItemActive = isNavigationItemActive(location.pathname, item);

                return (
                  <NavLink
                    className={isItemActive ? 'console-group-link is-active' : 'console-group-link'}
                    key={group.key}
                    to={item.to}
                  >
                    {item.label}
                  </NavLink>
                );
              }

              const isExpanded = expandedGroups[group.key] ?? true;
              const isActive = isNavigationGroupActive(location.pathname, group);

              return (
                <section className={isActive ? 'console-group is-active' : 'console-group'} key={group.key}>
                  <button
                    aria-label={group.label}
                    aria-expanded={isExpanded}
                    className="console-group-trigger"
                    onClick={() =>
                      setExpandedGroups((current) => ({
                        ...current,
                        [group.key]: !isExpanded,
                      }))
                    }
                    type="button"
                  >
                    <span className="console-group-title">{group.label}</span>
                    <span aria-hidden="true" className={isExpanded ? 'console-group-caret is-open' : 'console-group-caret'}>
                      ⌄
                    </span>
                  </button>
                  {isExpanded ? (
                    <div className="console-subnav">
                      {group.items.map((item) => {
                        const isItemActive = isNavigationItemActive(location.pathname, item);
                        return (
                          <NavLink
                            className={isItemActive ? 'console-subnav-link is-active' : 'console-subnav-link'}
                            key={item.to}
                            to={item.to}
                          >
                            {item.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}

            <NavLink
              className={isNavigationItemActive(location.pathname, accountItem) ? 'console-home-link is-active' : 'console-home-link'}
              to={accountItem.to}
            >
              <span>{accountItem.label}</span>
            </NavLink>
          </nav>
        </aside>
        <main className="console-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
