import type { HttpClient, SessionPayload } from './http';
import { DEFAULT_API_BASE_URL, deserializeSessionPayload, parseApiResponse, resolveApiUrl, toApiError } from './http';

export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupRequestIntakePayload = {
  name: string;
  birth_date: string;
  email: string;
  password: string;
  company_id: string;
  request_types: string[];
  privacy_policy_version: string;
  privacy_policy_consented: boolean;
  location_policy_version: string;
  location_policy_consented: boolean;
};

export type IdentityRecoveryPayload = {
  name: string;
  birth_date: string;
  email: string;
  password: string;
  privacy_policy_version: string;
  privacy_policy_consented: boolean;
  location_policy_version: string;
  location_policy_consented: boolean;
};

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
  const payload = (await parseApiResponse(response)) as IdentitySessionResponse | undefined;

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

export async function signupRequestIntake(
  payload: SignupRequestIntakePayload,
  baseUrl = DEFAULT_API_BASE_URL,
): Promise<void> {
  const response = await fetch(resolveApiUrl(baseUrl, '/auth/identity-signup-requests/'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const body = await parseApiResponse(response);
  if (!response.ok) {
    throw toApiError(response, body);
  }
}

export async function recoverIdentity(
  payload: IdentityRecoveryPayload,
  baseUrl = DEFAULT_API_BASE_URL,
): Promise<SessionPayload> {
  const response = await fetch(resolveApiUrl(baseUrl, '/auth/identity-recovery/'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const body = (await parseApiResponse(response)) as IdentitySessionResponse | undefined;
  if (
    !response.ok ||
    !body ||
    !('access_token' in body) ||
    !('session_kind' in body) ||
    !('identity' in body)
  ) {
    throw toApiError(response, body);
  }
  return deserializeSessionPayload(body);
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
