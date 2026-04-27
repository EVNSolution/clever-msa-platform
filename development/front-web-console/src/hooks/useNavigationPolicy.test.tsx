import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../api/http';
import type { IdentitySession } from '../types';

import { useNavigationPolicy } from './useNavigationPolicy';

const getNavigationPolicy = vi.fn();

vi.mock('../api/navigationPolicy', () => ({
  getNavigationPolicy: (...args: unknown[]) => getNavigationPolicy(...args),
}));

function NavigationPolicyProbe({
  client,
  session,
}: {
  client: HttpClient;
  session: IdentitySession;
}) {
  const state = useNavigationPolicy(client, session);

  return <output>{JSON.stringify(state)}</output>;
}

describe('useNavigationPolicy', () => {
  it('filters unsupported backend navigation keys from the resolved policy', async () => {
    getNavigationPolicy.mockResolvedValue({
      allowed_nav_keys: ['dashboard', 'notifications', 'dispatch', 'unknown-scope'],
      source: 'company_policy',
    });

    render(
      <NavigationPolicyProbe
        client={{ request: vi.fn() }}
        session={{
          accessToken: 'token',
          sessionKind: 'normal',
          email: 'company-admin@example.com',
          identity: {
            identityId: '10000000-0000-0000-0000-000000000001',
            name: '회사 전체 관리자',
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
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('"isLoading":false');
    });

    const renderedState = screen.getByRole('status').textContent ?? '';
    expect(renderedState).toContain('"allowedNavKeys":["dashboard","dispatch"]');
    expect(renderedState).not.toContain('notifications');
    expect(renderedState).not.toContain('unknown-scope');
  });
});
