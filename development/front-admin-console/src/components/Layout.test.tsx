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

    expect(screen.getByRole('link', { name: '계정 요청' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량 배정' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '단말기' })).not.toBeInTheDocument();
  });
});
