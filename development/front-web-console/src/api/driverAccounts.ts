import type { DriverAccountList } from '../types';
import type { HttpClient } from './http';

export function listManageableDriverAccounts(client: HttpClient) {
  return client.request<DriverAccountList>('/auth/driver-accounts/manage/');
}
