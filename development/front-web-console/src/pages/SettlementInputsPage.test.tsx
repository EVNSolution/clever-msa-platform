import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import * as deliveryRecords from '../api/deliveryRecords';
import * as driversApi from '../api/drivers';
import type { SessionPayload } from '../api/http';
import * as organizationApi from '../api/organization';
import { SettlementFlowProvider } from '../components/SettlementFlowContext';
import { SettlementInputsPage } from './SettlementInputsPage';

vi.mock('../api/organization', () => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/drivers', () => ({
  listDrivers: vi.fn(),
}));

vi.mock('../api/deliveryRecords', () => ({
  listDeliveryRecords: vi.fn(),
  listDailyDeliveryInputSnapshots: vi.fn(),
  createDeliveryRecord: vi.fn(),
  updateDeliveryRecord: vi.fn(),
  deleteDeliveryRecord: vi.fn(),
  createDailyDeliveryInputSnapshot: vi.fn(),
  updateDailyDeliveryInputSnapshot: vi.fn(),
  deleteDailyDeliveryInputSnapshot: vi.fn(),
}));

const mockedListCompanies = vi.mocked(organizationApi.listCompanies);
const mockedListFleets = vi.mocked(organizationApi.listFleets);
const mockedListDrivers = vi.mocked(driversApi.listDrivers);
const mockedListDeliveryRecords = vi.mocked(deliveryRecords.listDeliveryRecords);
const mockedListDailyDeliveryInputSnapshots = vi.mocked(
  deliveryRecords.listDailyDeliveryInputSnapshots,
);
const mockedUpdateDailyDeliveryInputSnapshot = vi.mocked(deliveryRecords.updateDailyDeliveryInputSnapshot);

describe('SettlementInputsPage', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows draft snapshots to be activated from the list', async () => {
    mockedListCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    mockedListFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    mockedListDrivers.mockResolvedValue([
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Seed Driver',
        external_user_name: 'seed-driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
      },
    ]);
    mockedListDeliveryRecords.mockResolvedValue([]);
    mockedListDailyDeliveryInputSnapshots
      .mockResolvedValueOnce([
        {
          daily_delivery_input_snapshot_id: 'snapshot-draft-1',
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          driver_id: '10000000-0000-0000-0000-000000000001',
          service_date: '2026-03-30',
          delivery_count: 0,
          total_distance_km: '0.00',
          total_base_amount: '0.00',
          source_record_count: 0,
          status: 'draft',
        },
      ])
      .mockResolvedValueOnce([
        {
          daily_delivery_input_snapshot_id: 'snapshot-draft-1',
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          driver_id: '10000000-0000-0000-0000-000000000001',
          service_date: '2026-03-30',
          delivery_count: 0,
          total_distance_km: '0.00',
          total_base_amount: '0.00',
          source_record_count: 0,
          status: 'active',
        },
      ]);
    mockedUpdateDailyDeliveryInputSnapshot.mockResolvedValue({
      daily_delivery_input_snapshot_id: 'snapshot-draft-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      driver_id: '10000000-0000-0000-0000-000000000001',
      service_date: '2026-03-30',
      delivery_count: 0,
      total_distance_km: '0.00',
      total_base_amount: '0.00',
      source_record_count: 0,
      status: 'active',
    });

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }} session={fleetManagerSingleSession}>
          <SettlementInputsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    await waitForElementToBeRemoved(
      () => screen.queryByText('정산 입력을 불러오는 중입니다...'),
      { timeout: 3000 },
    );

    const activateButton = await screen.findByRole('button', { name: '활성화' }, { timeout: 3000 });
    const user = userEvent.setup();
    await user.click(activateButton);

    await waitFor(() => {
      expect(screen.getByText('활성')).toBeInTheDocument();
      expect(screen.queryByText('draft snapshot')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);

  it('renders upload-first review language ahead of manual correction', async () => {
    mockedListCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    mockedListFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    mockedListDrivers.mockResolvedValue([
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Seed Driver',
        external_user_name: 'seed-driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
      },
    ]);
    mockedListDeliveryRecords.mockResolvedValue([
      {
        delivery_record_id: 'record-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        service_date: '2026-03-30',
        source_reference: 'dispatch-upload-row:upload-row-1',
        delivery_count: 133,
        distance_km: '0.00',
        base_amount: '0.00',
        status: 'confirmed',
        payload: {
          household_count: 90,
          small_region_text: '10H2',
          detailed_region_text: '10H2-가',
        },
      },
    ]);
    mockedListDailyDeliveryInputSnapshots.mockResolvedValue([
      {
        daily_delivery_input_snapshot_id: 'snapshot-draft-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        service_date: '2026-03-30',
        delivery_count: 0,
        total_distance_km: '0.00',
        total_base_amount: '0.00',
        source_record_count: 0,
        status: 'draft',
      },
    ]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }} session={fleetManagerSingleSession}>
          <SettlementInputsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    await waitForElementToBeRemoved(
      () => screen.queryByText('정산 입력을 불러오는 중입니다...'),
      { timeout: 3000 },
    );

    await screen.findByText(/업로드 결과로 만들어진 정산 대상 snapshot을 먼저 검토하고, 필요한 예외만 수동 보정합니다\./, {}, { timeout: 3000 });
    expect(screen.getByRole('heading', { name: '업로드 기준 검토' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Seed Driver', level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/박스 133/)).toBeInTheDocument();
    expect(screen.getByText(/10H2/)).toBeInTheDocument();
    expect(screen.getByText('dispatch-upload-row:upload-row-1')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /배차 보드로 이동/i }, { timeout: 3000 })).toHaveAttribute(
      'href',
      '/dispatch/boards',
    );
    expect(await screen.findByRole('link', { name: /정산 실행으로 이동/i }, { timeout: 3000 })).toHaveAttribute(
      'href',
      '/settlements/runs',
    );
  }, 10000);

  it('can override process-surface CTAs to stay inside the cockpit settlement workspace', async () => {
    mockedListCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    mockedListFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    mockedListDrivers.mockResolvedValue([
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Seed Driver',
        external_user_name: 'seed-driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
      },
    ]);
    mockedListDeliveryRecords.mockResolvedValue([]);
    mockedListDailyDeliveryInputSnapshots.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }} session={fleetManagerSingleSession}>
          <SettlementInputsPage
            client={{ request: vi.fn() }}
            dispatchBoardsPath="/settlement/dispatch"
            settlementRunsPath="/settlement/process"
          />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    await waitForElementToBeRemoved(
      () => screen.queryByText('정산 입력을 불러오는 중입니다...'),
      { timeout: 3000 },
    );

    expect(screen.getByRole('link', { name: /배차 보드로 이동/i })).toHaveAttribute('href', '/settlement/dispatch');
    expect(screen.getByRole('link', { name: /정산 실행으로 이동/i })).toHaveAttribute(
      'href',
      '/settlement/process',
    );
  });

  it('keeps company fixed and only exposes fleet selection in manual record modal for company super admins', async () => {
    mockedListCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    mockedListFleets.mockResolvedValue([
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
    mockedListDrivers.mockResolvedValue([
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Seed Driver',
        external_user_name: 'seed-driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
      },
    ]);
    mockedListDeliveryRecords.mockResolvedValue([]);
    mockedListDailyDeliveryInputSnapshots.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }} session={companySuperAdminSession}>
          <SettlementInputsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '원천 입력 생성' }));

    expect(screen.queryByRole('combobox', { name: '회사' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '플릿' })).toBeInTheDocument();
  });

  it('locks company and fleet selection in manual snapshot modal for single-fleet managers', async () => {
    mockedListCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    mockedListFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    mockedListDrivers.mockResolvedValue([
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Seed Driver',
        external_user_name: 'seed-driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
      },
    ]);
    mockedListDeliveryRecords.mockResolvedValue([]);
    mockedListDailyDeliveryInputSnapshots.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }} session={fleetManagerSingleSession}>
          <SettlementInputsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '스냅샷 생성' }));

    expect(screen.queryByRole('combobox', { name: '회사' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '플릿' })).not.toBeInTheDocument();
  });
});
