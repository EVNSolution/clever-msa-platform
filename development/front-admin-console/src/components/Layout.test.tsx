import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { Layout } from './Layout';

describe('Layout', () => {
  it('renders grouped drawer navigation instead of a flat top navigation bar', () => {
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
            },
            availableAccountTypes: ['manager'],
          }}
          onLogout={vi.fn()}
        />,
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조직 관리' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '차량' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배송원' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '운영' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배차 계획' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '회사' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '권역' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량 배정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배차' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '내 계정' })).toHaveLength(2);
    expect(container.querySelector('.console-home-icon')).toBeNull();
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
    expect(screen.getByRole('link', { name: '공지' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '지원' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '권역' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량 배정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배송원' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '정산' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '배차 계획' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '회사' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: '정산' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배차 계획' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공지' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '지원' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '권역' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '정산 조회' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배차' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배송원' })).toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: '정산' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배차 계획' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공지' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '지원' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '인사문서' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '권역' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '정산 조회' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배차' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배송원' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '차량 배정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '회사' })).not.toBeInTheDocument();
  });
});
