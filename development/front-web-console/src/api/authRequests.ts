import type { IdentitySignupRequestList, IdentitySignupRequestSummary } from '../types';
import type { HttpClient } from './http';

export function listManagedRequests(client: HttpClient, status = 'pending') {
  const searchParams = new URLSearchParams();
  if (status) {
    searchParams.set('status', status);
  }
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return client.request<IdentitySignupRequestList>(`/auth/identity-signup-requests/manage/${suffix}`);
}

export function approveManagedRequest(
  client: HttpClient,
  requestId: string,
  roleType?: string,
  fleetIds?: string[],
) {
  const body: Record<string, unknown> = {};
  if (roleType) {
    body.role_type = roleType;
  }
  if (fleetIds !== undefined) {
    body.fleet_ids = fleetIds;
  }
  return client.request<IdentitySignupRequestSummary>(`/auth/identity-signup-requests/${requestId}/approve/`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function rejectManagedRequest(
  client: HttpClient,
  requestId: string,
  rejectReason = 'admin_rejected',
) {
  return client.request<IdentitySignupRequestSummary>(`/auth/identity-signup-requests/${requestId}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reject_reason: rejectReason }),
  });
}

export function completeManagedManagerSetup(
  client: HttpClient,
  requestId: string,
  roleType: string,
  fleetIds?: string[],
) {
  const body: Record<string, unknown> = { role_type: roleType };
  if (fleetIds !== undefined) {
    body.fleet_ids = fleetIds;
  }
  return client.request<IdentitySignupRequestSummary>(
    `/auth/identity-signup-requests/${requestId}/complete-setup/`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}
