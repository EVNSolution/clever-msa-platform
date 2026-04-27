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
    role_display_name?: string | null;
    role_scope_level?: 'company' | 'fleet' | null;
    assigned_fleet_ids?: string[];
    scope_ui_mode?: 'company_selectable' | 'fleet_fixed_single' | 'fleet_selectable_multi' | null;
    default_fleet_id?: string | null;
  } | null;
  available_account_types: string[];
};

export type HttpClientConfig = {
  baseUrl: string;
  getAccessToken: () => string | null;
  onSessionRefresh: (payload: SessionPayload) => void;
  onUnauthorized: () => void;
  onNavigationForbidden?: (error: ApiError) => void;
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

export const GENERIC_SERVER_ERROR_MESSAGE = '서버 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.';

export function resolveDefaultApiBaseUrl(rawBaseUrl: string | undefined): string {
  const normalized = rawBaseUrl?.trim();
  return normalized && normalized.length > 0 ? normalized : '/api';
}

export const DEFAULT_API_BASE_URL = resolveDefaultApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL as string | undefined,
);

export function resolveApiUrl(baseUrl: string, path: string): string {
  const sanitizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${sanitizedBase}${normalizedPath}`;
}

function defaultHttpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Bad request.';
    case 401:
      return 'Authentication failed.';
    case 403:
      return 'Permission denied.';
    case 404:
      return 'Requested API endpoint was not found.';
    case 500:
      return 'Unexpected server error.';
    default:
      return 'Request failed.';
  }
}

function looksLikeHtml(text: string): boolean {
  const normalized = text.trimStart().toLowerCase();
  return normalized.startsWith('<!doctype html') || normalized.startsWith('<html');
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
  if (text && (contentType.includes('text/html') || looksLikeHtml(text))) {
    return {
      code: `http_${response.status}`,
      message: defaultHttpErrorMessage(response.status),
      details: {},
    };
  }
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
    if (error.status >= 500) {
      return GENERIC_SERVER_ERROR_MESSAGE;
    }
    return error.message;
  }
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return GENERIC_SERVER_ERROR_MESSAGE;
    }
    return error.message;
  }
  return fallback;
}

export function isNavigationPolicyApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.message === 'This API is not allowed by current navigation policy.'
  );
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
    roleDisplayName: payload.role_display_name ?? null,
    roleScopeLevel: payload.role_scope_level ?? null,
    assignedFleetIds: payload.assigned_fleet_ids ?? [],
    scopeUiMode: payload.scope_ui_mode ?? null,
    defaultFleetId: payload.default_fleet_id ?? null,
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
      const error = toApiError(response, payload);
      if (isNavigationPolicyApiError(error)) {
        config.onNavigationForbidden?.(error);
      }
      throw error;
    }

    return payload as T;
  }

  return { request };
}
