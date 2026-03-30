import type { SessionPayload } from './api/http';

const STORAGE_KEY = 'clever.operator.session';

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as {
    accessToken?: unknown;
    account?: {
      account_id?: unknown;
      email?: unknown;
      role?: unknown;
      is_active?: unknown;
    };
  };

  return (
    typeof payload.accessToken === 'string' &&
    typeof payload.account?.account_id === 'string' &&
    typeof payload.account.email === 'string' &&
    typeof payload.account.role === 'string' &&
    typeof payload.account.is_active === 'boolean'
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
