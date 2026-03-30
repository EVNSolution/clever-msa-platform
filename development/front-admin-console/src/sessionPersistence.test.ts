import { beforeEach, describe, expect, it } from 'vitest';

import { clearStoredSession, loadStoredSession, persistSession } from './sessionPersistence';

describe('sessionPersistence', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
      },
    });
  });

  it('stores and restores a valid admin session payload', () => {
    persistSession({
      accessToken: 'token-value',
      account: {
        account_id: '10000000-0000-0000-0000-000000000001',
        email: 'admin@example.com',
        role: 'admin',
        is_active: true,
      },
    });

    expect(loadStoredSession()).toEqual({
      accessToken: 'token-value',
      account: {
        account_id: '10000000-0000-0000-0000-000000000001',
        email: 'admin@example.com',
        role: 'admin',
        is_active: true,
      },
    });
  });

  it('ignores malformed storage values', () => {
    window.localStorage.setItem('clever.admin.session', '{"accessToken":123}');

    expect(loadStoredSession()).toBeNull();
  });

  it('clears the stored session', () => {
    persistSession({
      accessToken: 'token-value',
      account: {
        account_id: '10000000-0000-0000-0000-000000000001',
        email: 'admin@example.com',
        role: 'admin',
        is_active: true,
      },
    });

    clearStoredSession();

    expect(loadStoredSession()).toBeNull();
  });
});
