import type { HttpClient, SessionPayload } from './http';
import { DEFAULT_API_BASE_URL, parseApiResponse, resolveApiUrl, toApiError } from './http';

export type LoginCredentials = {
  email: string;
  password: string;
};

export async function login(
  credentials: LoginCredentials,
  baseUrl = DEFAULT_API_BASE_URL,
): Promise<SessionPayload> {
  const response = await fetch(resolveApiUrl(baseUrl, '/auth/login/'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
    credentials: 'include',
  });
  const payload = (await parseApiResponse(response)) as
    | { access_token: string; account: SessionPayload['account'] }
    | undefined;

  if (!response.ok || !payload || !('access_token' in payload) || !('account' in payload)) {
    throw toApiError(response, payload);
  }

  return {
    accessToken: payload.access_token,
    account: payload.account,
  };
}

export async function logout(baseUrl = DEFAULT_API_BASE_URL): Promise<void> {
  await fetch(resolveApiUrl(baseUrl, '/auth/logout/'), {
    method: 'POST',
    credentials: 'include',
  });
}

export function getMe(client: HttpClient) {
  return client.request<SessionPayload['account']>('/auth/me/');
}
