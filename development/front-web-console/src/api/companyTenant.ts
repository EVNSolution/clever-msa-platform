import type { TenantCompanyContext } from '../types';
import { DEFAULT_API_BASE_URL, parseApiResponse, resolveApiUrl, toApiError } from './http';

type TenantCompanyResponse = {
  company_id: string;
  company_name: string;
  tenant_code: string;
  workflow_profile: string;
  enabled_features?: string[];
  home_dashboard_preset?: Record<string, unknown>;
  workspace_presets?: Record<string, unknown>;
};

export async function resolvePublicCompanyTenant(
  tenantCode: string,
  baseUrl = DEFAULT_API_BASE_URL,
): Promise<TenantCompanyContext> {
  const query = new URLSearchParams({ tenant_code: tenantCode }).toString();
  const response = await fetch(resolveApiUrl(baseUrl, `/org/companies/public/resolve/?${query}`), {
    credentials: 'include',
  });
  const payload = await parseApiResponse(response);
  if (!response.ok || !payload || typeof payload !== 'object' || !('company_id' in payload)) {
    throw toApiError(response, payload);
  }

  const data = payload as TenantCompanyResponse;
  return {
    companyId: data.company_id,
    companyName: data.company_name,
    tenantCode: data.tenant_code,
    workflowProfile: data.workflow_profile,
    enabledFeatures: data.enabled_features ?? [],
    homeDashboardPreset: data.home_dashboard_preset ?? {},
    workspacePresets: data.workspace_presets ?? {},
  };
}
