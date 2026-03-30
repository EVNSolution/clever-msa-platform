import type { AccountSummary } from '../types';
import type { HttpClient } from './http';

export type AccountPayload = {
  email: string;
  password?: string;
  role: string;
  is_active: boolean;
};

export function listAccounts(client: HttpClient) {
  return client.request<AccountSummary[]>('/auth/accounts/');
}

export function getAccount(client: HttpClient, accountId: string) {
  return client.request<AccountSummary>(`/auth/accounts/${accountId}/`);
}

export function createAccount(client: HttpClient, payload: AccountPayload) {
  return client.request<AccountSummary>('/auth/accounts/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAccount(client: HttpClient, accountId: string, payload: Partial<AccountPayload>) {
  return client.request<AccountSummary>(`/auth/accounts/${accountId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
