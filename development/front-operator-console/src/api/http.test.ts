import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHttpClient } from './http';

const originalFetch = globalThis.fetch;

describe('createHttpClient', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retries the original request after refresh succeeds', async () => {
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
            account: {
              account_id: '10000000-0000-0000-0000-000000000001',
              email: 'user@example.com',
              role: 'user',
              is_active: true,
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ driver_id: '20000000-0000-0000-0000-000000000001' }]), {
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

    const result = await client.request('/drivers/');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onSessionRefresh).toHaveBeenCalledWith({
      accessToken: 'fresh-token',
      account: {
        account_id: '10000000-0000-0000-0000-000000000001',
        email: 'user@example.com',
        role: 'user',
        is_active: true,
      },
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(result).toEqual([{ driver_id: '20000000-0000-0000-0000-000000000001' }]);
  });

  it('clears the session when refresh also fails', async () => {
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
        new Response(JSON.stringify({ code: 'authentication_failed' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpClient({
      baseUrl: '/api',
      getAccessToken: () => 'expired-token',
      onSessionRefresh,
      onUnauthorized,
    });

    await expect(client.request('/drivers/')).rejects.toThrow('authentication_failed');
    expect(onSessionRefresh).not.toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
