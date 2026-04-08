import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettlementCriteriaPage } from './SettlementCriteriaPage';

const apiMocks = vi.hoisted(() => ({
  listSettlementPolicies: vi.fn(),
  listSettlementPolicyVersions: vi.fn(),
  listSettlementPolicyAssignments: vi.fn(),
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

vi.mock('../api/settlementRegistry', () => ({
  listSettlementPolicies: apiMocks.listSettlementPolicies,
  listSettlementPolicyVersions: apiMocks.listSettlementPolicyVersions,
  listSettlementPolicyAssignments: apiMocks.listSettlementPolicyAssignments,
  createSettlementPolicy: vi.fn(),
  updateSettlementPolicy: vi.fn(),
  deleteSettlementPolicy: vi.fn(),
  createSettlementPolicyVersion: vi.fn(),
  updateSettlementPolicyVersion: vi.fn(),
  deleteSettlementPolicyVersion: vi.fn(),
  createSettlementPolicyAssignment: vi.fn(),
  updateSettlementPolicyAssignment: vi.fn(),
  deleteSettlementPolicyAssignment: vi.fn(),
}));

describe('SettlementCriteriaPage', () => {
  it('renders policy, version, and assignment operating context', async () => {
    apiMocks.listSettlementPolicies.mockResolvedValue([
      {
        policy_id: 'policy-1',
        policy_code: 'BASE',
        name: '기본 정책',
        status: 'active',
        description: '기본 정산 정책',
      },
    ]);
    apiMocks.listSettlementPolicyVersions.mockResolvedValue([
      {
        policy_version_id: 'version-1',
        policy_id: 'policy-1',
        version_number: 1,
        rule_payload: { base_amount_per_delivery: 0 },
        status: 'published',
        published_at: '2026-03-01T00:00:00Z',
      },
    ]);
    apiMocks.listSettlementPolicyAssignments.mockResolvedValue([
      {
        assignment_id: 'assignment-1',
        policy_version_id: 'version-1',
        company_id: 'company-1',
        fleet_id: 'fleet-1',
        effective_start_date: '2026-03-01',
        effective_end_date: null,
        status: 'active',
      },
    ]);
    apiMocks.listCompanies.mockResolvedValue([{ company_id: 'company-1', route_no: 1, name: 'Seed Company' }]);
    apiMocks.listFleets.mockResolvedValue([
      { fleet_id: 'fleet-1', route_no: 1, company_id: 'company-1', name: 'Seed Fleet' },
    ]);

    render(<SettlementCriteriaPage client={{ request: vi.fn() }} />);

    await screen.findByRole('heading', { name: '정책 요약' });
    expect(screen.getByText('정산 기준 운영')).toBeInTheDocument();
    expect(screen.getByText('정책, 버전, 회사 연결을 한 흐름에서 유지합니다.')).toBeInTheDocument();
    expect(screen.getByText('총 1개 정책')).toBeInTheDocument();
    expect(screen.getByText('총 1개 연결')).toBeInTheDocument();
  });
});
