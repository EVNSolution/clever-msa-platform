import type {
  CompanyFleetPricingTable,
  SettlementConfig,
  SettlementConfigMetadata,
  SettlementPolicy,
  SettlementPolicyAssignment,
  SettlementPolicyVersion,
} from '../types';
import type { HttpClient } from './http';

export type SettlementPolicyPayload = Omit<SettlementPolicy, 'policy_id'>;
export type SettlementPolicyVersionPayload = Omit<SettlementPolicyVersion, 'policy_version_id'>;
export type SettlementPolicyAssignmentPayload = Omit<SettlementPolicyAssignment, 'assignment_id'>;
export type SettlementConfigPayload = Omit<SettlementConfig, 'singleton_key'>;
export type CompanyFleetPricingTablePayload = Omit<
  CompanyFleetPricingTable,
  'pricing_table_id'
>;

export function getSettlementConfigMetadata(client: HttpClient) {
  return client.request<SettlementConfigMetadata>('/settlement-registry/settlement-config/metadata/');
}

export function getSettlementConfig(client: HttpClient) {
  return client.request<SettlementConfig>('/settlement-registry/settlement-config/');
}

export function updateSettlementConfig(
  client: HttpClient,
  payload: Partial<SettlementConfigPayload>,
) {
  return client.request<SettlementConfig>('/settlement-registry/settlement-config/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listSettlementPricingTables(client: HttpClient) {
  return client.request<CompanyFleetPricingTable[]>('/settlement-registry/pricing-tables/');
}

export function createSettlementPricingTable(
  client: HttpClient,
  payload: CompanyFleetPricingTablePayload,
) {
  return client.request<CompanyFleetPricingTable>('/settlement-registry/pricing-tables/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSettlementPricingTable(
  client: HttpClient,
  pricingTableId: string,
  payload: Partial<CompanyFleetPricingTablePayload>,
) {
  return client.request<CompanyFleetPricingTable>(
    `/settlement-registry/pricing-tables/${pricingTableId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function listSettlementPolicies(client: HttpClient) {
  return client.request<SettlementPolicy[]>('/settlement-registry/policies/');
}

export function createSettlementPolicy(client: HttpClient, payload: SettlementPolicyPayload) {
  return client.request<SettlementPolicy>('/settlement-registry/policies/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSettlementPolicy(
  client: HttpClient,
  policyId: string,
  payload: Partial<SettlementPolicyPayload>,
) {
  return client.request<SettlementPolicy>(`/settlement-registry/policies/${policyId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteSettlementPolicy(client: HttpClient, policyId: string) {
  return client.request<void>(`/settlement-registry/policies/${policyId}/`, {
    method: 'DELETE',
  });
}

export function listSettlementPolicyVersions(client: HttpClient) {
  return client.request<SettlementPolicyVersion[]>('/settlement-registry/policy-versions/');
}

export function createSettlementPolicyVersion(client: HttpClient, payload: SettlementPolicyVersionPayload) {
  return client.request<SettlementPolicyVersion>('/settlement-registry/policy-versions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSettlementPolicyVersion(
  client: HttpClient,
  policyVersionId: string,
  payload: Partial<SettlementPolicyVersionPayload>,
) {
  return client.request<SettlementPolicyVersion>(
    `/settlement-registry/policy-versions/${policyVersionId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteSettlementPolicyVersion(client: HttpClient, policyVersionId: string) {
  return client.request<void>(`/settlement-registry/policy-versions/${policyVersionId}/`, {
    method: 'DELETE',
  });
}

export function listSettlementPolicyAssignments(client: HttpClient) {
  return client.request<SettlementPolicyAssignment[]>('/settlement-registry/policy-assignments/');
}

export function createSettlementPolicyAssignment(client: HttpClient, payload: SettlementPolicyAssignmentPayload) {
  return client.request<SettlementPolicyAssignment>('/settlement-registry/policy-assignments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSettlementPolicyAssignment(
  client: HttpClient,
  assignmentId: string,
  payload: Partial<SettlementPolicyAssignmentPayload>,
) {
  return client.request<SettlementPolicyAssignment>(
    `/settlement-registry/policy-assignments/${assignmentId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteSettlementPolicyAssignment(client: HttpClient, assignmentId: string) {
  return client.request<void>(`/settlement-registry/policy-assignments/${assignmentId}/`, {
    method: 'DELETE',
  });
}
