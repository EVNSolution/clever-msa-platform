import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHttpClient } from './http';

const originalFetch = globalThis.fetch;

describe('createHttpClient', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retries the original request after identity refresh succeeds', async () => {
    const onSessionRefresh = vi.fn();
    const onUnauthorized = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'authentication_failed' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'fresh-token',
            session_kind: 'normal',
            email: 'admin@example.com',
            identity: {
              identity_id: '10000000-0000-0000-0000-000000000001',
              name: '관리자',
              birth_date: '1970-01-01',
              status: 'active',
            },
            active_account: {
              account_type: 'manager',
              account_id: '20000000-0000-0000-0000-000000000001',
              company_id: '30000000-0000-0000-0000-000000000001',
              role_type: 'company_super_admin',
            },
            available_account_types: ['manager'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ company_id: '30000000-0000-0000-0000-000000000001' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpClient({
      baseUrl: '/api',
      getAccessToken: () => 'stale-token',
      onSessionRefresh,
      onUnauthorized,
    });

    const result = await client.request('/companies/');

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/identity-refresh/', {
      method: 'POST',
      credentials: 'include',
    });
    expect(onSessionRefresh).toHaveBeenCalledWith({
      accessToken: 'fresh-token',
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
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(result).toEqual([{ company_id: '30000000-0000-0000-0000-000000000001' }]);
  });
});
