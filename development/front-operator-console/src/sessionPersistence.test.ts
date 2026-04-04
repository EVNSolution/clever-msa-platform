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

  it('stores and restores a valid session payload', () => {
    persistSession({
      accessToken: 'token-value',
      sessionKind: 'normal',
      email: 'manager@example.com',
      identity: {
        identityId: '10000000-0000-0000-0000-000000000001',
        name: '운영자',
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
    });

    expect(loadStoredSession()).toEqual({
      accessToken: 'token-value',
      sessionKind: 'normal',
      email: 'manager@example.com',
      identity: {
        identityId: '10000000-0000-0000-0000-000000000001',
        name: '운영자',
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
    });
  });

  it('ignores malformed storage values', () => {
    window.localStorage.setItem('clever.operator.session', '{"accessToken":123}');

    expect(loadStoredSession()).toBeNull();
  });

  it('clears the stored session', () => {
    persistSession({
      accessToken: 'token-value',
      sessionKind: 'normal',
      email: 'manager@example.com',
      identity: {
        identityId: '10000000-0000-0000-0000-000000000001',
        name: '운영자',
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
    });

    clearStoredSession();

    expect(loadStoredSession()).toBeNull();
  });
});
