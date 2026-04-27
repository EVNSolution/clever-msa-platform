import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { getDefaultAllowedNavKeys } from '../authScopes';
import { Layout } from './Layout';

describe('Layout', () => {
  it('renders grouped drawer navigation for company super admin with company policy link', () => {
    const { container } = render(
      <MemoryRouter>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'admin@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'company_super_admin',
              roleDisplayName: '회사 전체 관리자',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />,
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(screen.getByText('회사 전체 관리자')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조직 관리' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '차량' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배송원' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '운영' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배차' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조직 관리' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '차량' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '배송원' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '운영' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '배차' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '정산' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '정산' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: '회사 메뉴 정책' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '관리자 역할' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '회사' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '권역' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량 배정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '배차 계획' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '내 계정' })).toHaveLength(2);
    expect(container.querySelector('.console-home-icon')).toBeNull();
  });

  it('shows global manager policy link only for system admin', () => {
    render(
      <MemoryRouter>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'sysadmin@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '시스템 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'system_admin',
              accountId: '20000000-0000-0000-0000-000000000001',
            },
            availableAccountTypes: ['system_admin'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: '관리' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '관리' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: '메뉴 정책' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '관리자 역할' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '회사 메뉴 정책' })).not.toBeInTheDocument();
  });

  it('shows separate dispatch planning and upload links when the dispatch group expands', () => {
    render(
      <MemoryRouter>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'dispatch@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '배차 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'company_super_admin',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '배차' }));

    expect(screen.getByRole('link', { name: '배차 계획' })).toHaveAttribute('href', '/dispatch/boards');
    expect(screen.getByRole('link', { name: '배차표 업로드' })).toHaveAttribute('href', '/dispatch/uploads');
  });

  it('prefers roleDisplayName over static role code in the topbar summary', () => {
    render(
      <MemoryRouter>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'custom@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '커스텀 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'dispatch_quality_lead',
              roleDisplayName: '배차 품질 리더',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('배차 품질 리더')).toBeInTheDocument();
    expect(screen.queryByText('dispatch_quality_lead')).not.toBeInTheDocument();
  });

  it('hides settlement and dispatch groups for vehicle managers', () => {
    render(
      <MemoryRouter>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'vehicle@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '차량 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'vehicle_manager',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />,
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '차량' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배송원' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '운영' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '공지' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '지원' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '알림' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '인사문서' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '권역' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량 배정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '배송원' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '정산' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '배차' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '회사' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '관리자 역할' })).not.toBeInTheDocument();
  });

  it('hides vehicle group for settlement managers while keeping dispatch and settlement groups', () => {
    render(
      <MemoryRouter>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'settlement@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '정산 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'settlement_manager',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />,
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배송원' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '운영' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '정산' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '정산' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '배차' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '공지' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '지원' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '알림' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '인사문서' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '권역' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '정산 조회' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '정산 처리' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '배차' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '배송원' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량 배정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '회사' })).not.toBeInTheDocument();
  });

  it('shows dispatch and settlement groups for fleet managers without vehicle or company groups', () => {
    render(
      <MemoryRouter>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'fleet@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '플릿 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'fleet_manager',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />,
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배송원' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '운영' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '정산' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '정산' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '배차' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '공지' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '지원' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '알림' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '인사문서' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '권역' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '정산 조회' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '정산 처리' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '배차' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '배송원' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량 배정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '회사' })).not.toBeInTheDocument();
  });

  it('expands the settlement group and highlights 정산 조회 on overview routes', () => {
    render(
      <MemoryRouter initialEntries={['/settlements/overview']}>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'settlement@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '정산 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'settlement_manager',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: '정산' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: '정산 조회' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산 처리' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산 조회' })).toHaveClass('is-active');
    expect(screen.getByRole('link', { name: '정산 처리' })).not.toHaveClass('is-active');
  });

  it('expands the settlement group and highlights 정산 처리 on process routes', () => {
    render(
      <MemoryRouter initialEntries={['/settlements/criteria']}>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'settlement@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '정산 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'settlement_manager',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: '정산' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: '정산 조회' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산 처리' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산 조회' })).not.toHaveClass('is-active');
    expect(screen.getByRole('link', { name: '정산 처리' })).toHaveClass('is-active');
  });

  it('returns stable nav item keys for vehicle manager defaults', () => {
    const allowedKeys = getDefaultAllowedNavKeys({
      accessToken: 'token',
      sessionKind: 'normal',
      email: 'vehicle@example.com',
      identity: {
        identityId: '10000000-0000-0000-0000-000000000001',
        name: '차량 관리자',
        birthDate: '1970-01-01',
        status: 'active',
      },
      activeAccount: {
        accountType: 'manager',
        accountId: '20000000-0000-0000-0000-000000000001',
        companyId: '30000000-0000-0000-0000-000000000001',
        roleType: 'vehicle_manager',
      },
      availableAccountTypes: ['manager'],
    });

    expect(allowedKeys).toEqual([
      'dashboard',
      'account',
      'accounts',
      'announcements',
      'support',
      'regions',
      'vehicles',
      'vehicle_assignments',
      'drivers',
      'personnel_documents',
    ]);
  });

  it('returns stable nav item keys for settlement manager defaults', () => {
    const allowedKeys = getDefaultAllowedNavKeys({
      accessToken: 'token',
      sessionKind: 'normal',
      email: 'settlement@example.com',
      identity: {
        identityId: '10000000-0000-0000-0000-000000000001',
        name: '정산 관리자',
        birthDate: '1970-01-01',
        status: 'active',
      },
      activeAccount: {
        accountType: 'manager',
        accountId: '20000000-0000-0000-0000-000000000001',
        companyId: '30000000-0000-0000-0000-000000000001',
        roleType: 'settlement_manager',
      },
      availableAccountTypes: ['manager'],
    });

    expect(allowedKeys).toEqual([
      'dashboard',
      'account',
      'accounts',
      'announcements',
      'support',
      'regions',
      'drivers',
      'personnel_documents',
      'dispatch',
      'settlements',
    ]);
  });

  it('hides items excluded by backend navigation policy even if role fallback would show them', () => {
    render(
      <MemoryRouter>
        <Layout
          allowedNavKeys={['dashboard', 'account', 'vehicles']}
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'vehicle@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '차량 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'vehicle_manager',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '내 계정' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: '차량' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '차량' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: '차량' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '배송원' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '공지' })).not.toBeInTheDocument();
  });

  it('hides a navigation group entirely when the backend policy removes every item in that group', () => {
    render(
      <MemoryRouter>
        <Layout
          allowedNavKeys={['dashboard', 'account', 'drivers']}
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'vehicle@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '차량 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'vehicle_manager',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: '차량' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배송원' })).toBeInTheDocument();
  });

  it('does not highlight 내 계정 when current route is 계정 요청', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/account-requests']}>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'admin@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'company_super_admin',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    const sidebarAccountLink = container.querySelector('a.console-home-link[href="/me"]');
    expect(sidebarAccountLink).not.toBeNull();
    expect(sidebarAccountLink).not.toHaveClass('is-active');
    expect(screen.getByRole('button', { name: '관리' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: '계정 요청' })).toHaveClass('is-active');
  });

  it('activates canonical menu policy routes without leaking to sibling items', () => {
    render(
      <MemoryRouter initialEntries={['/admin/menu-policy']}>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'sysadmin@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '시스템 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'system_admin',
              accountId: '20000000-0000-0000-0000-000000000001',
            },
            availableAccountTypes: ['system_admin'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: '관리' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: '메뉴 정책' })).toHaveClass('is-active');
    expect(screen.queryByRole('link', { name: '계정 요청' })?.className.includes('is-active')).toBeFalsy();
  });

  it('closes the mobile drawer after selecting a navigation link', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    window.dispatchEvent(new Event('resize'));

    const { container } = render(
      <MemoryRouter>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'dispatch@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '배차 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'company_super_admin',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '배차' }));

    const drawer = container.querySelector('.console-drawer');
    expect(drawer).toHaveClass('is-open');

    fireEvent.click(screen.getByRole('link', { name: '배차 계획' }));

    expect(drawer).not.toHaveClass('is-open');

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    window.dispatchEvent(new Event('resize'));
  });

  it('keeps the mobile drawer open when only toggling a group trigger', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    window.dispatchEvent(new Event('resize'));

    const { container } = render(
      <MemoryRouter>
        <Layout
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'dispatch@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '배차 관리자',
              birthDate: '1970-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000001',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'company_super_admin',
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));

    const drawer = container.querySelector('.console-drawer');
    expect(drawer).toHaveClass('is-open');

    fireEvent.click(screen.getByRole('button', { name: '배차' }));

    expect(drawer).toHaveClass('is-open');
    expect(screen.getByRole('link', { name: '배차 계획' })).toBeInTheDocument();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    window.dispatchEvent(new Event('resize'));
  });
});
