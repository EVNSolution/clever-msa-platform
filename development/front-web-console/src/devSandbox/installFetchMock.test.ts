import { beforeEach, describe, expect, it, vi } from 'vitest';

import { installFetchMock } from './installFetchMock';
import { resetLocalSandboxMockState } from './mockState';

describe('installFetchMock', () => {
  beforeEach(() => {
    resetLocalSandboxMockState();
  });

  it('intercepts every /api request and never falls through to the original fetch', async () => {
    const originalFetch = vi.fn().mockResolvedValue(new Response('should not be used'));
    globalThis.fetch = originalFetch as typeof fetch;

    const uninstall = installFetchMock();

    const response = await fetch('/api/org/companies/public/resolve/?tenant_code=cheonha');

    expect(originalFetch).not.toHaveBeenCalled();
    expect(response.ok).toBe(true);
    await expect(response.json()).resolves.toMatchObject({
      tenant_code: 'cheonha',
      company_name: '천하운수',
    });

    uninstall();
  });

  it('keeps non-api requests on the original fetch implementation', async () => {
    const passthroughResponse = new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
    const originalFetch = vi.fn().mockResolvedValue(passthroughResponse);
    globalThis.fetch = originalFetch as typeof fetch;

    const uninstall = installFetchMock();

    const response = await fetch('/healthz');

    expect(originalFetch).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({ ok: true });

    uninstall();
  });

  it('serves driver scope queries from the local sandbox mock instead of raising unsupported API errors', async () => {
    const originalFetch = vi.fn().mockResolvedValue(new Response('should not be used'));
    globalThis.fetch = originalFetch as typeof fetch;

    const uninstall = installFetchMock();

    const response = await fetch(
      '/api/drivers/?company_id=30000000-0000-0000-0000-000000000001&fleet_id=40000000-0000-0000-0000-000000000001',
    );

    expect(originalFetch).not.toHaveBeenCalled();
    expect(response.ok).toBe(true);
    await expect(response.json()).resolves.toMatchObject([
      {
        driver_id: 'driver-1',
        fleet_id: '40000000-0000-0000-0000-000000000001',
      },
    ]);

    uninstall();
  });
});
