import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import type { SessionPayload } from '../api/http';
import { formatActiveAccountRoleLabel } from '../uiLabels';

type CockpitGlobalHeaderProps = {
  onLogout: () => void | Promise<void>;
  session: SessionPayload;
};

function BellIcon() {
  return (
    <svg aria-hidden="true" className="cockpit-header-icon" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.25a4 4 0 0 0-4 4v2.22c0 .84-.27 1.67-.77 2.35l-1.17 1.58A1.5 1.5 0 0 0 7.27 17h9.46a1.5 1.5 0 0 0 1.21-2.4l-1.17-1.58a4 4 0 0 1-.77-2.35V8.25a4 4 0 0 0-4-4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M10.5 19a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" className="cockpit-header-icon" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 19.25c1.45-2.4 4.03-3.75 7-3.75s5.55 1.35 7 3.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function CockpitGlobalHeader({ onLogout, session }: CockpitGlobalHeaderProps) {
  const location = useLocation();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const roleLabel = formatActiveAccountRoleLabel(session.activeAccount);

  useEffect(() => {
    setIsAlertsOpen(false);
    setIsAccountOpen(false);
  }, [location.pathname]);

  return (
    <header className="cockpit-global-header">
      <div className="cockpit-global-header-actions">
        <div className="cockpit-header-menu-group">
          <button
            aria-expanded={isAlertsOpen}
            aria-haspopup="dialog"
            aria-label="알림"
            className={isAlertsOpen ? 'cockpit-header-action is-open' : 'cockpit-header-action'}
            onClick={() => {
              setIsAlertsOpen((current) => !current);
              setIsAccountOpen(false);
            }}
            type="button"
          >
            <BellIcon />
          </button>
          {isAlertsOpen ? (
            <div aria-label="알림 패널" className="cockpit-header-panel cockpit-alert-panel" role="dialog">
              <div className="cockpit-alert-panel-body">알림이 없습니다</div>
              <button className="cockpit-alert-read-all" onClick={() => setIsAlertsOpen(false)} type="button">
                모두 읽음
              </button>
            </div>
          ) : null}
        </div>

        <div className="cockpit-header-menu-group">
          <button
            aria-expanded={isAccountOpen}
            aria-haspopup="menu"
            aria-label="계정 메뉴"
            className={isAccountOpen ? 'cockpit-header-action is-open' : 'cockpit-header-action'}
            onClick={() => {
              setIsAccountOpen((current) => !current);
              setIsAlertsOpen(false);
            }}
            type="button"
          >
            <UserIcon />
          </button>
          {isAccountOpen ? (
            <div aria-label="계정 메뉴 패널" className="cockpit-header-panel cockpit-account-panel" role="menu">
              <div className="cockpit-account-panel-meta">
                <strong>{session.email}</strong>
                <span>{session.identity.name}</span>
                <small>{roleLabel}</small>
              </div>
              <div className="cockpit-account-panel-divider" />
              <div className="cockpit-account-panel-actions">
                <NavLink className="cockpit-account-panel-link" to="/me">
                  내 정보
                </NavLink>
                <button className="cockpit-account-panel-button" onClick={() => void onLogout()} type="button">
                  로그아웃
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
