import type { HttpClient, SessionPayload } from './http';
import { DEFAULT_API_BASE_URL, deserializeSessionPayload, parseApiResponse, resolveApiUrl, toApiError } from './http';

export type LoginCredentials = {
  email: string;
  password: string;
};

export async function login(
  credentials: LoginCredentials,
  baseUrl = DEFAULT_API_BASE_URL,
): Promise<SessionPayload> {
  const response = await fetch(resolveApiUrl(baseUrl, '/auth/identity-login/'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
    credentials: 'include',
  });
  const payload = (await parseApiResponse(response)) as
    | {
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
      }
    | undefined;

  if (
    !response.ok ||
    !payload ||
    !('access_token' in payload) ||
    !('session_kind' in payload) ||
    !('identity' in payload)
  ) {
    throw toApiError(response, payload);
  }

  return deserializeSessionPayload(payload);
}

export async function logout(baseUrl = DEFAULT_API_BASE_URL): Promise<void> {
  await fetch(resolveApiUrl(baseUrl, '/auth/identity-logout/'), {
    method: 'POST',
    credentials: 'include',
  });
}

export function getMe(client: HttpClient) {
  return client.request<{
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
  }>('/auth/identity-me/').then(deserializeSessionPayload);
}
