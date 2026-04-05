import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AccountsPage } from './AccountsPage';

const apiMocks = vi.hoisted(() => ({
  listManagedRequests: vi.fn(),
  listManageableManagerAccounts: vi.fn(),
  changeManagerAccountRole: vi.fn(),
  archiveManagerAccount: vi.fn(),
}));

vi.mock('../api/authRequests', () => ({
  listManagedRequests: apiMocks.listManagedRequests,
}));

vi.mock('../api/managerAccounts', () => ({
  listManageableManagerAccounts: apiMocks.listManageableManagerAccounts,
  changeManagerAccountRole: apiMocks.changeManagerAccountRole,
  archiveManagerAccount: apiMocks.archiveManagerAccount,
}));

vi.mock('../api/organization', () => ({
  listCompanies: vi.fn().mockResolvedValue([
    { company_id: '40000000-0000-0000-0000-000000000001', name: '알파 회사' },
  ]),
}));

describe('AccountsPage', () => {
  it('renders request management tabs and manageable manager accounts', async () => {
    apiMocks.listManagedRequests.mockResolvedValue({
      identity: {
        identity_id: '10000000-0000-0000-0000-000000000001',
        name: '현재 관리자',
        birth_date: '1970-01-01',
        status: 'active',
      },
      inquiry_message: '',
      requests: [
        {
          identity_signup_request_id: '20000000-0000-0000-0000-000000000001',
          identity: {
            identity_id: '30000000-0000-0000-0000-000000000001',
            name: '홍길동',
            birth_date: '1990-01-01',
            status: 'active',
          },
          request_type: 'manager_account_create',
          request_display_name: '관리자 계정 신청',
          status: 'pending',
          status_message: '검토 중입니다.',
          company_id: '40000000-0000-0000-0000-000000000001',
          requested_at: '2026-04-04T09:00:00Z',
        },
      ],
    });
    apiMocks.listManageableManagerAccounts.mockResolvedValue({
      accounts: [
        {
          manager_account_id: '50000000-0000-0000-0000-000000000001',
          identity: {
            identity_id: '60000000-0000-0000-0000-000000000001',
            name: '차량 관리자',
            birth_date: '1988-02-02',
            status: 'active',
          },
          company_id: '40000000-0000-0000-0000-000000000001',
          role_type: 'vehicle_manager',
          status: 'active',
          created_at: '2026-04-04T09:30:00Z',
        },
      ],
    });
    apiMocks.changeManagerAccountRole.mockResolvedValue({
      manager_account_id: '50000000-0000-0000-0000-000000000001',
      identity: {
        identity_id: '60000000-0000-0000-0000-000000000001',
        name: '차량 관리자',
        birth_date: '1988-02-02',
        status: 'active',
      },
      company_id: '40000000-0000-0000-0000-000000000001',
      role_type: 'settlement_manager',
      status: 'active',
      created_at: '2026-04-04T09:30:00Z',
    });
    apiMocks.archiveManagerAccount.mockResolvedValue({
      manager_account_id: '50000000-0000-0000-0000-000000000001',
      identity: {
        identity_id: '60000000-0000-0000-0000-000000000001',
        name: '차량 관리자',
        birth_date: '1988-02-02',
        status: 'active',
      },
      company_id: '40000000-0000-0000-0000-000000000001',
      role_type: 'settlement_manager',
      status: 'archived',
      created_at: '2026-04-04T09:30:00Z',
    });

    render(
      <MemoryRouter>
        <AccountsPage
          client={{ request: vi.fn() }}
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'super@example.com',
            identity: {
              identityId: '90000000-0000-0000-0000-000000000001',
              name: '회사 전체 관리자',
              birthDate: '1990-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '91000000-0000-0000-0000-000000000001',
              companyId: '40000000-0000-0000-0000-000000000001',
              roleType: 'company_super_admin',
            },
            availableAccountTypes: ['manager'],
          }}
        />
      </MemoryRouter>,
    );

    await screen.findByText('홍길동');
    expect(screen.getByText('현재 권한으로 처리할 수 있는 하위 요청과 관리자 계정만 표시합니다.')).toBeInTheDocument();
    expect(screen.getAllByText('알파 회사').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '대기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '설정 중' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '승인됨' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '반려됨' })).toBeInTheDocument();
    expect(screen.getByText('관리자 계정 신청')).toBeInTheDocument();
    expect(screen.getByText('검토 중입니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '승인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '반려' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '활성 관리자 계정' })).toBeInTheDocument();
    expect(screen.getAllByText('차량 관리자').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '권한 변경' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '계정 종료' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /계정 생성/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '회사 전체 관리자' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: '플릿 관리자' })).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('차량 관리자'), { target: { value: 'fleet_manager' } });
    fireEvent.click(screen.getByRole('button', { name: '권한 변경' }));
    await waitFor(() => {
      expect(apiMocks.changeManagerAccountRole).toHaveBeenCalledWith(
        expect.anything(),
        '50000000-0000-0000-0000-000000000001',
        'fleet_manager',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '계정 종료' }));
    await waitFor(() => {
      expect(apiMocks.archiveManagerAccount).toHaveBeenCalledWith(
        expect.anything(),
        '50000000-0000-0000-0000-000000000001',
      );
    });
  });
});
