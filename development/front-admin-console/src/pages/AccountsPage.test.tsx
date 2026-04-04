import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AccountsPage } from './AccountsPage';

const apiMocks = vi.hoisted(() => ({
  listManagedRequests: vi.fn(),
}));

vi.mock('../api/authRequests', () => ({
  listManagedRequests: apiMocks.listManagedRequests,
}));

describe('AccountsPage', () => {
  it('renders request management tabs instead of legacy account creation', async () => {
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

    render(
      <MemoryRouter>
        <AccountsPage client={{ request: vi.fn() }} />
      </MemoryRouter>,
    );

    await screen.findByText('홍길동');
    expect(screen.getByRole('button', { name: '대기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '설정 중' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '승인됨' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '반려됨' })).toBeInTheDocument();
    expect(screen.getByText('관리자 계정 신청')).toBeInTheDocument();
    expect(screen.getByText('검토 중입니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '승인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '반려' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /계정 생성/i })).not.toBeInTheDocument();
  });
});
