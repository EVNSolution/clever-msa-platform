import type { WorkspaceBootstrapPayload } from '../types';
import type { HttpClient } from './http';

type WorkspaceBootstrapResponse = {
  company_id: string | null;
  company_name: string | null;
  tenant_code: string | null;
  workflow_profile: string;
  enabled_features?: string[];
  home_dashboard_preset?: Record<string, unknown>;
  workspace_presets?: Record<string, unknown>;
};

export async function getWorkspaceBootstrap(
  client: HttpClient,
  tenantCode?: string,
): Promise<WorkspaceBootstrapPayload> {
  const query = tenantCode
    ? `?${new URLSearchParams({ tenant_code: tenantCode }).toString()}`
    : '';
  const payload = await client.request<WorkspaceBootstrapResponse>(`/auth/workspace-bootstrap/${query}`);
  return {
    companyId: payload.company_id,
    companyName: payload.company_name,
    tenantCode: payload.tenant_code,
    workflowProfile: payload.workflow_profile,
    enabledFeatures: payload.enabled_features ?? [],
    homeDashboardPreset: payload.home_dashboard_preset ?? {},
    workspacePresets: payload.workspace_presets ?? {},
  };
}
