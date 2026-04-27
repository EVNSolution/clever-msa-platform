import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { CockpitShell } from './CockpitShell';
import { SubdomainAccordionNav, resolveTopLevelMenu } from './SubdomainAccordionNav';

function renderNav(initialEntry = '/') {
  render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
      initialEntries={[initialEntry]}
    >
      <Routes>
        <Route path="*" element={<RouteAwareNav />} />
      </Routes>
    </MemoryRouter>,
  );
}

function RouteAwareNav() {
  const location = useLocation();

  return (
    <SubdomainAccordionNav
      activeMenu={resolveTopLevelMenu(location.pathname)}
      companyName="천하운수"
    />
  );
}

const shellSession = {
  accessToken: 'token',
  sessionKind: 'normal',
  email: 'manager@example.com',
  identity: {
    identityId: '10000000-0000-0000-0000-000000000001',
    name: '관리자',
    birthDate: '1990-01-01',
    status: 'active',
  },
  activeAccount: {
    accountType: 'manager' as const,
    accountId: '20000000-0000-0000-0000-000000000001',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'settlement_manager',
    roleDisplayName: '정산 관리자',
  },
  availableAccountTypes: ['manager'],
};

function renderShell(initialEntry = '/') {
  render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
      initialEntries={[initialEntry]}
    >
      <Routes>
        <Route
          path="*"
          element={<CockpitShell companyName="천하운수" onLogout={vi.fn()} session={shellSession as never} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function RouteSwitcher() {
  const navigate = useNavigate();

  return (
    <>
      <button type="button" onClick={() => navigate('/other')}>
        route-switch
      </button>
      <button type="button" onClick={() => navigate('/')}>
        dashboard-route
      </button>
    </>
  );
}

describe('SubdomainAccordionNav', () => {
  it('dashboard route renders the refined company card copy', () => {
    renderNav();

    expect(screen.getByText('CLEVER')).toBeInTheDocument();
    expect(screen.getByText('EV&Solution')).toBeInTheDocument();
    expect(screen.getByText('천하운수')).toBeInTheDocument();
    expect(screen.queryByText('전용 업무 cockpit')).not.toBeInTheDocument();
  });

  it('dashboard route starts collapsed with no top-level menu items visible', () => {
    renderNav();

    const trigger = screen.getByRole('button', { name: '상위 메뉴 열기' });
    const primaryMenuSurface = screen.getByTestId('subdomain-primary-menu-surface');
    const nav = document.getElementById('subdomain-top-level-menu');

    expect(nav).not.toBeNull();
    expect(within(nav!).queryAllByRole('link')).toHaveLength(0);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(within(trigger).getByTestId('subdomain-trigger-icon')).toBeInTheDocument();
    expect(trigger).not.toHaveTextContent('펼치기');
    expect(trigger).not.toHaveTextContent('닫힘');
    expect(nav).toHaveAttribute('aria-hidden', 'true');
    expect(primaryMenuSurface).toHaveAttribute('data-state', 'collapsed');
    expect(screen.queryByRole('button', { name: '정산' })).not.toBeInTheDocument();
  });

  it('top-level expansion only reveals 대시보드, 차량, 정산', async () => {
    const user = userEvent.setup();
    renderNav();

    const trigger = screen.getByRole('button', { name: '상위 메뉴 열기' });

    await user.click(trigger);

    const nav = screen.getByRole('navigation', { name: '서브도메인 메뉴' });
    const launcherCluster = screen.getByTestId('subdomain-launcher-cluster');
    const brandBlock = screen.getByTestId('subdomain-brand-block');
    const primaryMenuSurface = screen.getByTestId('subdomain-primary-menu-surface');
    const collapseTrigger = screen.getByRole('button', { name: '상위 메뉴 닫기' });

    expect(within(nav).getByRole('link', { name: '대시보드' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: '차량' })).toHaveAttribute('href', '/vehicles/home');
    expect(within(nav).getByRole('link', { name: '정산' })).toHaveAttribute('href', '/settlement/home');
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['대시보드', '차량', '정산']);
    expect(launcherCluster).toContainElement(nav);
    expect(brandBlock).not.toContainElement(collapseTrigger);
    expect(primaryMenuSurface).toContainElement(collapseTrigger);
    expect(primaryMenuSurface).toContainElement(nav);
    expect(collapseTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(collapseTrigger).getByTestId('subdomain-trigger-icon')).toBeInTheDocument();
    expect(collapseTrigger).not.toHaveTextContent('펼치기');
    expect(collapseTrigger).not.toHaveTextContent('닫힘');
    expect(nav).toHaveAttribute('aria-hidden', 'false');
    expect(primaryMenuSurface).toHaveAttribute('data-state', 'expanded');
  });

  it('settlement route keeps the accordion nav sidebar-free', () => {
    renderNav('/settlement/home');

    const launcherCluster = screen.getByTestId('subdomain-launcher-cluster');
    const topLevelNav = document.getElementById('subdomain-top-level-menu');

    expect(topLevelNav).not.toBeNull();
    expect(launcherCluster).toContainElement(topLevelNav);
    expect(topLevelNav).toBeInTheDocument();
    expect(within(topLevelNav!).queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByRole('navigation', { name: '정산 메뉴' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('subdomain-settlement-sidebar')).not.toBeInTheDocument();
  });

  it('vehicle route renders the detached vehicle sidebar through CockpitShell', () => {
    renderShell('/vehicles/home');

    const trigger = screen.getByRole('button', { name: '상위 메뉴 열기' });
    const vehicleSidebar = screen.getByTestId('subdomain-vehicle-sidebar');
    const vehicleNav = within(vehicleSidebar).getByRole('navigation', { name: '차량 메뉴' });

    expect(trigger).toHaveClass('is-active');
    expect(vehicleSidebar.closest('.cockpit-rail')).toBeNull();
    expect(vehicleSidebar.tagName).toBe('ASIDE');
    expect(vehicleSidebar).toHaveClass('cockpit-child-nav', 'cockpit-detached-sidebar');
    expect(vehicleSidebar).not.toHaveAttribute('data-nav-label');
    expect(vehicleNav).toHaveClass('cockpit-child-nav', 'cockpit-detached-sidebar');
    expect(within(vehicleNav).getByRole('link', { name: '홈' })).toHaveAttribute('href', '/vehicles/home');
    expect(within(vehicleNav).getByRole('link', { name: '배송원 현황' })).toHaveAttribute('href', '/drivers');
    expect(within(vehicleNav).getByRole('link', { name: '차량' })).toHaveAttribute('href', '/vehicles');
    expect(within(vehicleNav).getByRole('link', { name: '차량 배정' })).toHaveAttribute('href', '/vehicle-assignments');
    expect(within(vehicleNav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      '홈',
      '배송원 현황',
      '차량',
      '차량 배정',
    ]);
    expect(within(vehicleNav).getByRole('link', { name: '홈' })).toHaveClass('is-active');
    expect(within(vehicleNav).getByRole('link', { name: '차량' })).not.toHaveClass('is-active');
  });

  it.each(['/vehicles/123', '/vehicles/123/edit', '/vehicles/123/accesses/new'])(
    'vehicle sidebar keeps 차량 active on nested route %s',
    (pathname) => {
      renderShell(pathname);

      const vehicleSidebar = screen.getByTestId('subdomain-vehicle-sidebar');
      const vehicleNav = within(vehicleSidebar).getByRole('navigation', { name: '차량 메뉴' });

      expect(within(vehicleNav).getByRole('link', { name: '홈' })).not.toHaveClass('is-active');
      expect(within(vehicleNav).getByRole('link', { name: '차량' })).toHaveClass('is-active');
    },
  );

  it('settlement route renders the detached settlement sidebar through CockpitShell', () => {
    renderShell('/settlement/home');

    const settlementSidebar = screen.getByTestId('subdomain-settlement-sidebar');
    const settlementNav = within(settlementSidebar).getByRole('navigation', { name: '정산 메뉴' });

    expect(settlementSidebar.closest('.cockpit-rail')).toBeNull();
    expect(settlementSidebar).toBeInTheDocument();
    expect(settlementNav).toBeInTheDocument();
    expect(within(settlementNav).getAllByRole('link')).toHaveLength(6);
  });

  it.each([
    ['/vehicles/home', true],
    ['/vehicles', false],
    ['/vehicles/123', false],
    ['/drivers', false],
    ['/drivers/123', false],
    ['/vehicle-assignments', false],
    ['/vehicle-assignments/123', false],
  ])('resolves %s to the vehicle launcher contract', async (pathname, isExactVehicleHome) => {
    const user = userEvent.setup();
    renderNav(pathname);

    expect(resolveTopLevelMenu(pathname)).toBe('vehicle');

    const trigger = screen.getByRole('button', { name: '상위 메뉴 열기' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    const nav = screen.getByRole('navigation', { name: '서브도메인 메뉴' });
    expect(nav).not.toBeNull();
    expect(within(nav).getByRole('link', { name: '차량' })).toHaveClass('is-active');
    if (isExactVehicleHome) {
      expect(within(nav).getByRole('link', { name: '차량' })).toHaveAttribute('aria-current', 'page');
    } else {
      expect(within(nav).getByRole('link', { name: '차량' })).not.toHaveAttribute('aria-current');
    }
    expect(screen.queryByRole('navigation', { name: '정산 메뉴' })).not.toBeInTheDocument();
  });

  it('top-level expanded state stays open after route changes until the user collapses it', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
        initialEntries={['/']}
      >
        <Routes>
          <Route
            path="*"
            element={
              <>
                <RouteSwitcher />
                <RouteAwareNav />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: '상위 메뉴 열기' }));
    const nav = screen.getByRole('navigation', { name: '서브도메인 메뉴' });
    expect(within(nav).getAllByRole('link')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'route-switch' }));
    expect(screen.getByRole('button', { name: '상위 메뉴 닫기' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getAllByRole('link')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: '상위 메뉴 닫기' }));
    expect(screen.getByRole('button', { name: '상위 메뉴 열기' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(nav).queryAllByRole('link')).toHaveLength(0);
  });

  it('returning to / removes the settlement sidebar but preserves the top-level menu state', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
        initialEntries={['/']}
      >
        <Routes>
          <Route
            path="*"
            element={
              <>
                <RouteSwitcher />
                <CockpitShell companyName="천하운수" onLogout={vi.fn()} session={shellSession as never} />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: '상위 메뉴 열기' }));
    expect(screen.getByRole('button', { name: '상위 메뉴 닫기' })).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('link', { name: '정산' }));
    const topLevelNav = screen.getByRole('navigation', { name: '서브도메인 메뉴' });
    expect(within(topLevelNav).getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('navigation', { name: '정산 메뉴' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'dashboard-route' }));
    expect(screen.queryByRole('navigation', { name: '정산 메뉴' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '상위 메뉴 닫기' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(topLevelNav).getAllByRole('link')).toHaveLength(3);
  });

});
