import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import { SettlementFlowProvider } from '../components/SettlementFlowContext';
import type { SessionPayload } from '../api/http';
import { SettlementRunsPage } from './SettlementRunsPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  listSettlementRuns: vi.fn(),
  listDeliveryRecords: vi.fn(),
  listDailyDeliveryInputSnapshots: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

vi.mock('../api/deliveryRecords', () => ({
  listDeliveryRecords: apiMocks.listDeliveryRecords,
  listDailyDeliveryInputSnapshots: apiMocks.listDailyDeliveryInputSnapshots,
  createDeliveryRecord: vi.fn(),
  updateDeliveryRecord: vi.fn(),
  deleteDeliveryRecord: vi.fn(),
  createDailyDeliveryInputSnapshot: vi.fn(),
  updateDailyDeliveryInputSnapshot: vi.fn(),
  deleteDailyDeliveryInputSnapshot: vi.fn(),
  bootstrapDailySnapshotsFromDispatch: vi.fn(),
}));

vi.mock('../api/settlements', () => ({
  listSettlementRuns: apiMocks.listSettlementRuns,
  createSettlementRun: vi.fn(),
  updateSettlementRun: vi.fn(),
  deleteSettlementRun: vi.fn(),
  listSettlementItems: vi.fn(),
  createSettlementItem: vi.fn(),
  updateSettlementItem: vi.fn(),
  deleteSettlementItem: vi.fn(),
}));

describe('SettlementRunsPage', () => {
  const systemAdminSession: SessionPayload = {
    accessToken: 'token',
    sessionKind: 'normal',
    email: 'system@example.com',
    identity: {
      identityId: 'identity-1',
      name: '시스템 관리자',
      birthDate: '1990-01-01',
      status: 'active',
    },
    activeAccount: {
      accountType: 'system_admin',
      accountId: 'system-admin-1',
    },
    availableAccountTypes: ['system_admin'],
  };

  const companySuperAdminSession: SessionPayload = {
    ...systemAdminSession,
    email: 'admin@example.com',
    activeAccount: {
      accountType: 'manager',
      accountId: 'manager-1',
      companyId: '30000000-0000-0000-0000-000000000001',
      roleType: 'company_super_admin',
      roleDisplayName: '회사 총괄 관리자',
      roleScopeLevel: 'company',
      assignedFleetIds: [],
      scopeUiMode: 'company_selectable',
      defaultFleetId: null,
    },
    availableAccountTypes: ['manager'],
  };

  const fleetManagerSingleSession: SessionPayload = {
    ...companySuperAdminSession,
    email: 'fleet@example.com',
    activeAccount: {
      ...companySuperAdminSession.activeAccount!,
      roleType: 'fleet_manager',
      roleDisplayName: '플릿 관리자',
      roleScopeLevel: 'fleet',
      assignedFleetIds: ['40000000-0000-0000-0000-000000000001'],
      scopeUiMode: 'fleet_fixed_single',
      defaultFleetId: '40000000-0000-0000-0000-000000000001',
    },
  };

  it('shows execution readiness and handoff to results for the selected context', async () => {
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    apiMocks.listDeliveryRecords.mockResolvedValue([
      {
        delivery_record_id: 'd1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        service_date: '2026-03-31',
        source_reference: 'sheet-row-1',
        delivery_count: 3,
        distance_km: '10.50',
        base_amount: '20000.00',
        status: 'confirmed',
        payload: {},
      },
    ]);
    apiMocks.listDailyDeliveryInputSnapshots.mockResolvedValue([
      {
        daily_delivery_input_snapshot_id: 's-draft',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        service_date: '2026-03-31',
        delivery_count: 0,
        total_distance_km: '0.00',
        total_base_amount: '0.00',
        source_record_count: 0,
        status: 'draft',
      },
      {
        daily_delivery_input_snapshot_id: 's1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        service_date: '2026-03-31',
        delivery_count: 3,
        total_distance_km: '10.50',
        total_base_amount: '20000.00',
        source_record_count: 1,
        status: 'active',
      },
    ]);
    apiMocks.listSettlementRuns.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }} session={fleetManagerSingleSession}>
          <SettlementRunsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '정산 실행 요약' });
    expect(screen.queryByText('유효한 입력')).not.toBeInTheDocument();
    const activeSnapshotMetric = screen.getByText('Active Snapshot').closest('article') as HTMLElement;
    expect(activeSnapshotMetric).toBeTruthy();
    await waitFor(() => {
      expect(within(activeSnapshotMetric).getByText('1')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByRole('link', { name: /정산 결과로 이동/i })).toBeInTheDocument();
  }, 10000);

  it('keeps company fixed and only exposes fleet selection for company super admins', async () => {
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
      {
        fleet_id: '40000000-0000-0000-0000-000000000002',
        route_no: 2,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Ops Fleet',
      },
    ]);
    apiMocks.listDeliveryRecords.mockResolvedValue([]);
    apiMocks.listDailyDeliveryInputSnapshots.mockResolvedValue([]);
    apiMocks.listSettlementRuns.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }} session={companySuperAdminSession}>
          <SettlementRunsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '정산 실행 생성' }));

    expect(screen.queryByRole('combobox', { name: '회사' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '플릿' })).toBeInTheDocument();
  });

  it('locks both company and fleet selection for single-fleet managers', async () => {
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    apiMocks.listDeliveryRecords.mockResolvedValue([]);
    apiMocks.listDailyDeliveryInputSnapshots.mockResolvedValue([]);
    apiMocks.listSettlementRuns.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }} session={fleetManagerSingleSession}>
          <SettlementRunsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '정산 실행 생성' }));

    expect(screen.queryByRole('combobox', { name: '회사' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '플릿' })).not.toBeInTheDocument();
  });
});
