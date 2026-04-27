import type { CompanyManagerRole } from '../types';
import type { HttpClient } from './http';

type CompanyManagerRoleListResponse = {
  roles: CompanyManagerRole[];
};

export function listCompanyManagerRoles(client: HttpClient, companyId: string) {
  return client.request<CompanyManagerRoleListResponse>(
    `/auth/company-manager-roles/?company_id=${encodeURIComponent(companyId)}`,
  );
}

export function createCompanyManagerRole(
  client: HttpClient,
  payload: { companyId: string; displayName: string; scopeLevel: 'company' | 'fleet' },
) {
  return client.request<CompanyManagerRole>('/auth/company-manager-roles/', {
    method: 'POST',
    body: JSON.stringify({
      company_id: payload.companyId,
      display_name: payload.displayName,
      scope_level: payload.scopeLevel,
    }),
  });
}

export function updateCompanyManagerRole(
  client: HttpClient,
  roleId: string,
  payload: {
    code?: string;
    displayName?: string;
    allowedNavKeys?: string[];
    scopeLevel?: 'company' | 'fleet';
  },
) {
  const body: Record<string, unknown> = {};
  if (payload.code !== undefined) {
    body.code = payload.code;
  }
  if (payload.displayName !== undefined) {
    body.display_name = payload.displayName;
  }
  if (payload.allowedNavKeys !== undefined) {
    body.allowed_nav_keys = payload.allowedNavKeys;
  }
  if (payload.scopeLevel !== undefined) {
    body.scope_level = payload.scopeLevel;
  }
  return client.request<CompanyManagerRole>(`/auth/company-manager-roles/${roleId}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function reorderCompanyManagerRoles(
  client: HttpClient,
  payload: { companyId: string; roleIds: string[] },
) {
  return client.request<CompanyManagerRoleListResponse>('/auth/company-manager-roles/reorder/', {
    method: 'POST',
    body: JSON.stringify({
      company_id: payload.companyId,
      role_ids: payload.roleIds,
    }),
  });
}

export function deleteCompanyManagerRole(client: HttpClient, roleId: string) {
  return client.request<void>(`/auth/company-manager-roles/${roleId}/`, {
    method: 'DELETE',
  });
}
