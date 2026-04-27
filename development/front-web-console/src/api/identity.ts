import type {
  IdentityConsentCurrent,
  IdentityLoginMethod,
  IdentityLoginMethodList,
  IdentityProfile,
  IdentitySignupRequestList,
  IdentitySignupRequestSummary,
} from '../types';
import { deserializeSessionPayload, type HttpClient, type SessionPayload } from './http';

export function getIdentityProfile(client: HttpClient) {
  return client.request<IdentityProfile>('/auth/identity-profile/');
}

export function updateIdentityProfile(client: HttpClient, payload: { name?: string; birth_date?: string }) {
  return client.request<IdentityProfile>('/auth/identity-profile/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getIdentityConsent(client: HttpClient) {
  return client.request<IdentityConsentCurrent>('/auth/identity-consent/');
}

export function withdrawIdentityConsent(
  client: HttpClient,
  payload: { consent_type: 'privacy_policy' | 'location_policy' },
) {
  return client
    .request<{
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
    }>('/auth/identity-consent/withdraw/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    .then(deserializeSessionPayload);
}

export function recoverIdentityConsent(
  client: HttpClient,
  payload: {
    privacy_policy_version: string;
    privacy_policy_consented: boolean;
    location_policy_version: string;
    location_policy_consented: boolean;
  },
) {
  return client
    .request<{
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
    }>('/auth/identity-consent/recover/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    .then(deserializeSessionPayload);
}

export function listIdentityLoginMethods(client: HttpClient) {
  return client.request<IdentityLoginMethodList>('/auth/identity-login-methods/');
}

export function createIdentityLoginMethod(
  client: HttpClient,
  payload:
    | { method_type: 'email'; email: string }
    | { method_type: 'phone'; phone_number: string },
) {
  return client.request<IdentityLoginMethod>('/auth/identity-login-methods/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteIdentityLoginMethod(
  client: HttpClient,
  methodId: string,
  payload: { confirm?: boolean; current_password?: string },
) {
  return client.request<void>(`/auth/identity-login-methods/${methodId}/delete/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateIdentityPassword(
  client: HttpClient,
  payload: { current_password?: string; new_password: string },
) {
  return client.request<{ message: string }>('/auth/identity-password/', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function listMySignupRequests(client: HttpClient) {
  return client.request<IdentitySignupRequestList>('/auth/identity-signup-requests/me/');
}

export function createMySignupRequest(
  client: HttpClient,
  payload: { company_id: string; request_type: string; is_re_request?: boolean },
) {
  return client.request<IdentitySignupRequestSummary>('/auth/identity-signup-requests/me/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelMySignupRequest(client: HttpClient, requestId: string) {
  return client.request<IdentitySignupRequestSummary>(`/auth/identity-signup-requests/${requestId}/cancel/`, {
    method: 'POST',
  });
}

export type ConsentRecoveryPayload = Parameters<typeof recoverIdentityConsent>[1];
export type ConsentRecoveryResult = SessionPayload;
