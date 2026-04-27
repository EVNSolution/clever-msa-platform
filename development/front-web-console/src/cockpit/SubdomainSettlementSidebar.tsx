import { NavLink } from 'react-router-dom';

import type { SettlementChildNavItem } from './SubdomainAccordionNav';

type SubdomainSettlementSidebarProps = {
  items: SettlementChildNavItem[];
};

function getSettlementSidebarLinkId(to: string, suffix: 'title' | 'description') {
  return `cockpit-settlement-sidebar-${to.slice(1).replace(/\//g, '-')}-${suffix}`;
}

export function SubdomainSettlementSidebar({ items }: SubdomainSettlementSidebarProps) {
  return (
    <div className="cockpit-detached-settlement-sidebar" data-testid="subdomain-settlement-sidebar">
      <nav aria-label="정산 메뉴" className="cockpit-child-nav cockpit-detached-sidebar">
        {items.map((item) => (
          <NavLink
            aria-describedby={getSettlementSidebarLinkId(item.to, 'description')}
            aria-labelledby={getSettlementSidebarLinkId(item.to, 'title')}
            className={({ isActive }) => (isActive ? 'cockpit-nav-child-link is-active' : 'cockpit-nav-child-link')}
            end={item.to === '/settlement/home'}
            key={item.to}
            to={item.to}
          >
            <span className="cockpit-settlement-nav-title" id={getSettlementSidebarLinkId(item.to, 'title')}>
              {item.label}
            </span>
            <span className="cockpit-settlement-nav-description" id={getSettlementSidebarLinkId(item.to, 'description')}>
              {item.description}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
