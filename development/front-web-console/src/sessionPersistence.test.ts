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

    clearStoredSession();
  });

  it('stores and restores a valid admin session payload', () => {
    persistSession({
      accessToken: 'token-value',
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

    expect(loadStoredSession()).toEqual({
      accessToken: 'token-value',
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
  });

  it('ignores malformed storage values', () => {
    window.localStorage.setItem('clever.admin.session', '{"accessToken":123}');

    expect(loadStoredSession()).toBeNull();
  });

  it('clears the stored session', () => {
    persistSession({
      accessToken: 'token-value',
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

    clearStoredSession();

    expect(loadStoredSession()).toBeNull();
  });

  it('falls back to in-memory storage when localStorage writes fail', () => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('Access denied', 'SecurityError');
        },
        removeItem: () => {
          storage.clear();
        },
        clear: () => {
          storage.clear();
        },
      },
    });

    expect(() =>
      persistSession({
        accessToken: 'token-value',
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
      }),
    ).not.toThrow();

    expect(loadStoredSession()).toEqual({
      accessToken: 'token-value',
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

    clearStoredSession();

    expect(loadStoredSession()).toBeNull();
  });
});
