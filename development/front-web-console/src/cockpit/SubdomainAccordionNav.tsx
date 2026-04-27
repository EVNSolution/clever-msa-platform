import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import { SubdomainBrandCard } from './SubdomainBrandCard';
import { SubdomainExpandTrigger } from './SubdomainExpandTrigger';

export type TopLevelMenuKey = 'dashboard' | 'vehicle' | 'settlement';
export type SettlementChildNavItem = {
  slug: 'home' | 'dispatch' | 'crew' | 'operations' | 'process' | 'team';
  label: string;
  to: string;
  description: string;
};

export type VehicleChildNavItem = {
  slug: 'home' | 'drivers' | 'vehicles' | 'assignments';
  label: string;
  to: string;
};

type SubdomainAccordionNavProps = {
  activeMenu: TopLevelMenuKey;
  companyName: string;
};

type TopLevelMenuItem = {
  key: TopLevelMenuKey;
  label: string;
  to: string;
};

const topLevelMenuItems: TopLevelMenuItem[] = [
  { key: 'dashboard', label: '대시보드', to: '/' },
  { key: 'vehicle', label: '차량', to: '/vehicles/home' },
  { key: 'settlement', label: '정산', to: '/settlement/home' },
];

export const settlementChildNavItems: SettlementChildNavItem[] = [
  { slug: 'home', label: '홈', to: '/settlement/home', description: '현황 요약' },
  { slug: 'dispatch', label: '배차 데이터', to: '/settlement/dispatch', description: '업로드 · 정산' },
  { slug: 'crew', label: '배송원 현황', to: '/settlement/crew', description: '플릿 기준 목록' },
  { slug: 'operations', label: '운영 현황', to: '/settlement/operations', description: '날짜별 현황' },
  { slug: 'process', label: '정산 처리', to: '/settlement/process', description: '정산 관리' },
  { slug: 'team', label: '팀 관리', to: '/settlement/team', description: '단가 설정' },
];

export const vehicleChildNavItems: VehicleChildNavItem[] = [
  { slug: 'home', label: '홈', to: '/vehicles/home' },
  { slug: 'drivers', label: '배송원 현황', to: '/drivers' },
  { slug: 'vehicles', label: '차량', to: '/vehicles' },
  { slug: 'assignments', label: '차량 배정', to: '/vehicle-assignments' },
];

export function resolveTopLevelMenu(pathname: string): TopLevelMenuKey {
  if (
    pathname === '/vehicles/home' ||
    pathname === '/vehicles' ||
    pathname.startsWith('/vehicles/') ||
    pathname.startsWith('/drivers') ||
    pathname.startsWith('/vehicle-assignments')
  ) {
    return 'vehicle';
  }

  return pathname === '/settlement' || pathname.startsWith('/settlement/') ? 'settlement' : 'dashboard';
}

export function SubdomainAccordionNav({ activeMenu, companyName }: SubdomainAccordionNavProps) {
  const [isTopLevelMenuExpanded, setIsTopLevelMenuExpanded] = useState(false);
  const isDetachedWorkspaceRoute = activeMenu !== 'dashboard';
  const surfaceState = isTopLevelMenuExpanded ? 'expanded' : 'collapsed';
  const topLevelMenuSurfaceClassName = isTopLevelMenuExpanded
    ? 'cockpit-primary-menu-surface is-expanded'
    : 'cockpit-primary-menu-surface';
  const topLevelNavClassName = isTopLevelMenuExpanded ? 'cockpit-nav is-expanded' : 'cockpit-nav';

  return (
    <>
      <div className="cockpit-launcher-cluster" data-testid="subdomain-launcher-cluster">
        <div className="cockpit-brand-block" data-testid="subdomain-brand-block">
          <SubdomainBrandCard companyName={companyName} />
        </div>

        <div className={topLevelMenuSurfaceClassName} data-state={surfaceState} data-testid="subdomain-primary-menu-surface">
          <SubdomainExpandTrigger
            isActive={isDetachedWorkspaceRoute}
            isExpanded={isTopLevelMenuExpanded}
            onToggle={() => setIsTopLevelMenuExpanded((current) => !current)}
          />

          <nav
            aria-hidden={isTopLevelMenuExpanded ? 'false' : 'true'}
            aria-label="서브도메인 메뉴"
            className={topLevelNavClassName}
            id="subdomain-top-level-menu"
          >
            {isTopLevelMenuExpanded
              ? topLevelMenuItems.map((item) => (
                  <NavLink
                    aria-current={activeMenu === item.key ? 'page' : undefined}
                    className={activeMenu === item.key ? 'cockpit-nav-link is-active' : 'cockpit-nav-link'}
                    end={item.to === '/'}
                    key={item.key}
                    to={item.to}
                  >
                    <span>{item.label}</span>
                  </NavLink>
                ))
              : null}
          </nav>
        </div>
      </div>
    </>
  );
}
