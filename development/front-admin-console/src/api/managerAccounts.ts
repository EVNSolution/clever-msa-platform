import type { ManagerAccountList, ManagerAccountSummary } from '../types';
import type { HttpClient } from './http';

export function listManageableManagerAccounts(client: HttpClient) {
  return client.request<ManagerAccountList>('/auth/manager-accounts/manage/');
}

export function changeManagerAccountRole(client: HttpClient, managerAccountId: string, roleType: string) {
  return client.request<ManagerAccountSummary>(`/auth/manager-accounts/${managerAccountId}/change-role/`, {
    method: 'POST',
    body: JSON.stringify({ role_type: roleType }),
  });
}

export function archiveManagerAccount(client: HttpClient, managerAccountId: string) {
  return client.request<ManagerAccountSummary>(`/auth/manager-accounts/${managerAccountId}/archive/`, {
    method: 'POST',
  });
}
