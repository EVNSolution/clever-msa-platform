import type { DriverAccountLinkSummary } from '../types';
import type { HttpClient } from './http';

type DriverAccountLinkQuery = {
  activeOnly?: boolean;
  driverAccountId?: string;
  driverId?: string;
};

export function listDriverAccountLinks(client: HttpClient, query: DriverAccountLinkQuery = {}) {
  const searchParams = new URLSearchParams();
  if (query.driverId) {
    searchParams.set('driver_id', query.driverId);
  }
  if (query.driverAccountId) {
    searchParams.set('driver_account_id', query.driverAccountId);
  }
  if (query.activeOnly === false) {
    searchParams.set('active_only', 'false');
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/auth/driver-account-links/?${queryString}` : '/auth/driver-account-links/';
  return client.request<DriverAccountLinkSummary[]>(path);
}

export function createDriverAccountLink(client: HttpClient, driverAccountId: string, driverId: string) {
  return client.request<DriverAccountLinkSummary>('/auth/driver-account-links/', {
    method: 'POST',
    body: JSON.stringify({
      driver_account_id: driverAccountId,
      driver_id: driverId,
    }),
  });
}

export function unlinkDriverAccountLink(client: HttpClient, linkId: string) {
  return client.request<DriverAccountLinkSummary>(`/auth/driver-account-links/${linkId}/unlink/`, {
    method: 'POST',
  });
}
