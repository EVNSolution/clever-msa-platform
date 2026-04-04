import type { ActiveAccountSummary, IdentitySession, IdentitySummary } from '../types';

export type SessionPayload = IdentitySession;

type IdentitySessionResponse = {
  access_token: string;
  session_kind: string;
  email: string;
  identity: {
    identity_id: string;
    name: string;
    birth_date: string;
    status: string;
  };
  active_account: {
    account_type: 'system_admin' | 'manager' | 'driver';
    account_id: string;
    company_id?: string | null;
    role_type?: string | null;
  } | null;
  available_account_types: string[];
};

export type HttpClientConfig = {
  baseUrl: string;
  getAccessToken: () => string | null;
  onSessionRefresh: (payload: SessionPayload) => void;
  onUnauthorized: () => void;
};

export type HttpClient = {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
};

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details: unknown) {
    super(message || code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const DEFAULT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export function resolveApiUrl(baseUrl: string, path: string): string {
  const sanitizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${sanitizedBase}${normalizedPath}`;
}

export async function parseApiResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : undefined;
}

export function toApiError(response: Response, payload: unknown): ApiError {
  const code =
    typeof payload === 'object' && payload !== null && 'code' in payload
      ? String((payload as { code: string }).code)
      : `http_${response.status}`;
  const message =
    typeof payload === 'object' && payload !== null && 'message' in payload
      ? String((payload as { message: string }).message)
      : code;
  const details =
    typeof payload === 'object' && payload !== null && 'details' in payload
      ? (payload as { details: unknown }).details
      : payload;
  return new ApiError(response.status, code, message, details);
}

export function getErrorMessage(error: unknown, fallback = 'Request failed.'): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function toIdentitySummary(payload: IdentitySessionResponse['identity']): IdentitySummary {
  return {
    identityId: payload.identity_id,
    name: payload.name,
    birthDate: payload.birth_date,
    status: payload.status,
  };
}

function toActiveAccountSummary(
  payload: IdentitySessionResponse['active_account'],
): ActiveAccountSummary | null {
  if (payload == null) {
    return null;
  }

  return {
    accountType: payload.account_type,
    accountId: payload.account_id,
    companyId: payload.company_id ?? null,
    roleType: payload.role_type ?? null,
  };
}

export function deserializeSessionPayload(payload: IdentitySessionResponse): SessionPayload {
  return {
    accessToken: payload.access_token,
    sessionKind: payload.session_kind,
    email: payload.email,
    identity: toIdentitySummary(payload.identity),
    activeAccount: toActiveAccountSummary(payload.active_account),
    availableAccountTypes: payload.available_account_types,
  };
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  let refreshPromise: Promise<boolean> | null = null;

  async function refreshAccessToken(): Promise<boolean> {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      const response = await fetch(resolveApiUrl(config.baseUrl, '/auth/identity-refresh/'), {
        method: 'POST',
        credentials: 'include',
      });
      const payload = (await parseApiResponse(response)) as
        | IdentitySessionResponse
        | { code?: string; message?: string; details?: unknown }
        | undefined;

      if (
        !response.ok ||
        !payload ||
        !('access_token' in payload) ||
        !('session_kind' in payload) ||
        !('identity' in payload)
      ) {
        config.onUnauthorized();
        return false;
      }

      config.onSessionRefresh(deserializeSessionPayload(payload));
      return true;
    })().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  }

  async function request<T>(path: string, init: RequestInit = {}, allowRetry = true): Promise<T> {
    const headers = new Headers(init.headers);
    const accessToken = config.getAccessToken();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(resolveApiUrl(config.baseUrl, path), {
      ...init,
      headers,
      credentials: 'include',
    });
    const payload = await parseApiResponse(response);

    if (response.status === 401 && allowRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request<T>(path, init, false);
      }
      throw toApiError(response, payload);
    }

    if (!response.ok) {
      throw toApiError(response, payload);
    }

    return payload as T;
  }

  return { request };
}
