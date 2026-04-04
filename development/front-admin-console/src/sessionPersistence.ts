import type { SessionPayload } from './api/http';

const STORAGE_KEY = 'clever.admin.session';

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as {
    accessToken?: unknown;
    sessionKind?: unknown;
    email?: unknown;
    identity?: {
      identityId?: unknown;
      name?: unknown;
      birthDate?: unknown;
      status?: unknown;
    };
    activeAccount?: {
      accountType?: unknown;
      accountId?: unknown;
      companyId?: unknown;
      roleType?: unknown;
    } | null;
    availableAccountTypes?: unknown;
  };

  return (
    typeof payload.accessToken === 'string' &&
    typeof payload.sessionKind === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.identity?.identityId === 'string' &&
    typeof payload.identity.name === 'string' &&
    typeof payload.identity.birthDate === 'string' &&
    typeof payload.identity.status === 'string' &&
    (payload.activeAccount == null ||
      (typeof payload.activeAccount.accountType === 'string' &&
        typeof payload.activeAccount.accountId === 'string')) &&
    Array.isArray(payload.availableAccountTypes)
  );
}

export function loadStoredSession(): SessionPayload | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isSessionPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistSession(session: SessionPayload): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
