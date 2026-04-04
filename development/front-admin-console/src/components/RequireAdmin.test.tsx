import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RequireAdmin } from './RequireAdmin';

describe('RequireAdmin', () => {
  it('blocks non-admin accounts and offers a sign-out action', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <RequireAdmin
        session={{
          accessToken: 'token',
          sessionKind: 'normal',
          email: 'user@example.com',
          identity: {
            identityId: '10000000-0000-0000-0000-000000000001',
            name: '사용자',
            birthDate: '1990-01-01',
            status: 'active',
          },
          activeAccount: {
            accountType: 'driver',
            accountId: '20000000-0000-0000-0000-000000000001',
          },
          availableAccountTypes: ['driver'],
        }}
        onLogout={onLogout}
      >
        <div>Admin content</div>
      </RequireAdmin>,
    );

    expect(screen.getByText(/관리자 권한 필요/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /로그인 화면으로/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders children for admin accounts', () => {
    render(
      <RequireAdmin
        session={{
          accessToken: 'token',
          sessionKind: 'normal',
          email: 'admin@example.com',
          identity: {
            identityId: '10000000-0000-0000-0000-000000000002',
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
        onLogout={() => undefined}
      >
        <div>Admin content</div>
      </RequireAdmin>,
    );

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });
});
