import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RequireRoleScope } from './RequireRoleScope';

describe('RequireRoleScope', () => {
  it('blocks a manager without the required scope', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <RequireRoleScope
        message="정산 관리 권한이 있는 계정만 접근할 수 있습니다."
        onLogout={onLogout}
        session={{
          accessToken: 'token',
          sessionKind: 'normal',
          email: 'vehicle@example.com',
          identity: {
            identityId: '10000000-0000-0000-0000-000000000001',
            name: '차량 관리자',
            birthDate: '1990-01-01',
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
        title="정산 권한 필요"
        when={() => false}
      >
        <div>정산 화면</div>
      </RequireRoleScope>,
    );

    expect(screen.getByText('정산 권한 필요')).toBeInTheDocument();
    expect(screen.queryByText('정산 화면')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '로그인 화면으로' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders children when the required scope is allowed', () => {
    render(
      <RequireRoleScope
        message="정산 관리 권한이 있는 계정만 접근할 수 있습니다."
        onLogout={() => undefined}
        session={{
          accessToken: 'token',
          sessionKind: 'normal',
          email: 'settlement@example.com',
          identity: {
            identityId: '10000000-0000-0000-0000-000000000001',
            name: '정산 관리자',
            birthDate: '1990-01-01',
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
        title="정산 권한 필요"
        when={() => true}
      >
        <div>정산 화면</div>
      </RequireRoleScope>,
    );

    expect(screen.getByText('정산 화면')).toBeInTheDocument();
  });
});
