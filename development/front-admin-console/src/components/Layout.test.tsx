import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { Layout } from './Layout';

describe('Layout', () => {
  it('omits standalone terminal navigation from the admin shell', () => {
    render(
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
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />,
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '계정 요청' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공지' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '지원' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '권역' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량 배정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배차' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '단말기' })).not.toBeInTheDocument();
  });

  it('hides settlement navigation for vehicle managers', () => {
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
    expect(screen.getByRole('link', { name: '공지' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '지원' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '권역' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량 배정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배송원' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '정산' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '배차' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '회사' })).not.toBeInTheDocument();
  });

  it('hides vehicle navigation for settlement managers', () => {
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
    expect(screen.getByRole('link', { name: '공지' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '지원' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '권역' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배차' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배송원' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량 배정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '회사' })).not.toBeInTheDocument();
  });

  it('shows dispatch and settlement navigation for fleet managers without vehicle or company menus', () => {
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
    expect(screen.getByRole('link', { name: '공지' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '지원' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '권역' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배차' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배송원' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량 배정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '회사' })).not.toBeInTheDocument();
  });
});
