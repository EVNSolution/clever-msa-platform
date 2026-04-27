import { allNavItemKeys } from '../authScopes';
import type { SessionPayload } from '../api/http';
import { resolveDevSessionPreset } from './sessionPresets';
import type {
  Company,
  DailyDeliveryInputSnapshot,
  DeliveryRecord,
  DispatchPlan,
  DriverProfile,
  DriverLatestSettlementPage,
  Fleet,
  SettlementItem,
  SettlementRun,
  TenantCompanyContext,
  WorkspaceBootstrapPayload,
} from '../types';

type IdentitySessionResponse = {
  access_token: string;
  session_kind: string;
  email: string;
  identity: {
    identity_id: string;
    name: string;
    birth_date: string;
    status: string;
  };
  active_account: {
    account_type: 'system_admin' | 'manager' | 'driver';
    account_id: string;
    company_id?: string | null;
    role_type?: string | null;
    role_display_name?: string | null;
    role_scope_level?: 'company' | 'fleet' | null;
    assigned_fleet_ids?: string[];
    scope_ui_mode?: 'company_selectable' | 'fleet_fixed_single' | 'fleet_selectable_multi' | null;
    default_fleet_id?: string | null;
  } | null;
  available_account_types: string[];
};

type LocalSandboxMockState = {
  sessions: Record<string, IdentitySessionResponse>;
  publicCompanies: Company[];
  companies: Company[];
  fleets: Fleet[];
  drivers: DriverProfile[];
  tenantContexts: Record<string, TenantCompanyContext>;
  mainWorkspaceBootstrap: WorkspaceBootstrapPayload;
  tenantWorkspaceBootstraps: Record<string, WorkspaceBootstrapPayload>;
  deliveryRecords: DeliveryRecord[];
  dailySnapshots: DailyDeliveryInputSnapshot[];
  settlementRuns: SettlementRun[];
  settlementReadRuns: SettlementRun[];
  settlementReadItems: SettlementItem[];
  latestDriverSettlements: DriverLatestSettlementPage['results'];
  dispatchPlans: DispatchPlan[];
  nextIds: {
    settlementRun: number;
  };
};

const systemAdminSession = resolveDevSessionPreset('ev-dashboard.com')!.session;
const cheonhaManagerSession = resolveDevSessionPreset('cheonha.ev-dashboard.com')!.session;

function toIdentitySessionResponse(session: SessionPayload): IdentitySessionResponse {
  return {
    access_token: session.accessToken,
    session_kind: session.sessionKind,
    email: session.email,
    identity: {
      identity_id: session.identity.identityId,
      name: session.identity.name,
      birth_date: session.identity.birthDate,
      status: session.identity.status,
    },
    active_account: session.activeAccount
      ? {
          account_type: session.activeAccount.accountType,
          account_id: session.activeAccount.accountId,
          company_id: session.activeAccount.companyId ?? null,
          role_type: session.activeAccount.roleType ?? null,
          role_display_name: session.activeAccount.roleDisplayName ?? null,
          role_scope_level: session.activeAccount.roleScopeLevel ?? null,
          assigned_fleet_ids: session.activeAccount.assignedFleetIds ?? [],
          scope_ui_mode: session.activeAccount.scopeUiMode ?? null,
          default_fleet_id: session.activeAccount.defaultFleetId ?? null,
        }
      : null,
    available_account_types: session.availableAccountTypes,
  };
}

function createInitialState(): LocalSandboxMockState {
  const cheonhaCompany: Company = {
    company_id: '30000000-0000-0000-0000-000000000001',
    route_no: 1,
    public_ref: 'cheonha',
    name: '천하운수',
  };
  const cheonhaMainFleet: Fleet = {
    fleet_id: '40000000-0000-0000-0000-000000000001',
    route_no: 1,
    public_ref: 'main-domain',
    company_id: cheonhaCompany.company_id,
    name: '천하 메인 플릿',
  };
  const cheonhaOpsFleet: Fleet = {
    fleet_id: '40000000-0000-0000-0000-000000000002',
    route_no: 2,
    public_ref: 'ops',
    company_id: cheonhaCompany.company_id,
    name: '천하 운영 플릿',
  };
  const drivers: DriverProfile[] = [
    {
      driver_id: 'driver-1',
      route_no: 1,
      company_id: cheonhaCompany.company_id,
      fleet_id: cheonhaMainFleet.fleet_id,
      name: '천하 기사 1',
      external_user_name: 'CHEONHA_DRIVER_1',
      ev_id: 'EV-0001',
      phone_number: '010-0000-0001',
      address: '서울',
    },
    {
      driver_id: 'driver-2',
      route_no: 2,
      company_id: cheonhaCompany.company_id,
      fleet_id: cheonhaOpsFleet.fleet_id,
      name: '천하 기사 2',
      external_user_name: 'CHEONHA_DRIVER_2',
      ev_id: 'EV-0002',
      phone_number: '010-0000-0002',
      address: '서울',
    },
  ];

  return {
    sessions: {
      [systemAdminSession.accessToken]: toIdentitySessionResponse(systemAdminSession),
      [cheonhaManagerSession.accessToken]: toIdentitySessionResponse(cheonhaManagerSession),
    },
    publicCompanies: [cheonhaCompany],
    companies: [cheonhaCompany],
    fleets: [cheonhaMainFleet, cheonhaOpsFleet],
    drivers,
    tenantContexts: {
      cheonha: {
        companyId: cheonhaCompany.company_id,
        companyName: cheonhaCompany.name,
        tenantCode: 'cheonha',
        workflowProfile: 'transport_ops',
        enabledFeatures: ['settlement', 'dispatch', 'vehicle'],
        homeDashboardPreset: {},
        workspacePresets: {},
      },
    },
    mainWorkspaceBootstrap: {
      companyId: null,
      companyName: null,
      tenantCode: null,
      workflowProfile: 'main_domain_admin_v1',
      enabledFeatures: ['accounts', 'companies', 'dispatch', 'settlement', 'vehicle'],
      homeDashboardPreset: {},
      workspacePresets: {},
    },
    tenantWorkspaceBootstraps: {
      cheonha: {
        companyId: cheonhaCompany.company_id,
        companyName: cheonhaCompany.name,
        tenantCode: 'cheonha',
        workflowProfile: 'transport_ops',
        enabledFeatures: ['settlement', 'dispatch', 'vehicle'],
        homeDashboardPreset: {},
        workspacePresets: {},
      },
    },
    deliveryRecords: [
      {
        delivery_record_id: 'delivery-record-1',
        company_id: cheonhaCompany.company_id,
        fleet_id: cheonhaMainFleet.fleet_id,
        driver_id: 'driver-1',
        service_date: '2026-03-31',
        source_reference: 'dispatch-upload-1',
        delivery_count: 12,
        distance_km: '88.50',
        base_amount: '240000.00',
        status: 'confirmed',
        payload: {},
      },
    ],
    dailySnapshots: [
      {
        daily_delivery_input_snapshot_id: 'snapshot-1',
        company_id: cheonhaCompany.company_id,
        fleet_id: cheonhaMainFleet.fleet_id,
        driver_id: 'driver-1',
        service_date: '2026-03-31',
        delivery_count: 12,
        total_distance_km: '88.50',
        total_base_amount: '240000.00',
        source_record_count: 1,
        status: 'active',
      },
      {
        daily_delivery_input_snapshot_id: 'snapshot-2',
        company_id: cheonhaCompany.company_id,
        fleet_id: cheonhaMainFleet.fleet_id,
        driver_id: 'driver-2',
        service_date: '2026-03-30',
        delivery_count: 8,
        total_distance_km: '61.00',
        total_base_amount: '180000.00',
        source_record_count: 1,
        status: 'draft',
      },
    ],
    settlementRuns: [],
    settlementReadRuns: [
      {
        settlement_run_id: 'settlement-read-run-1',
        company_id: cheonhaCompany.company_id,
        fleet_id: cheonhaMainFleet.fleet_id,
        period_start: '2026-03-01',
        period_end: '2026-03-31',
        status: 'approved',
      },
    ],
    settlementReadItems: [
      {
        settlement_item_id: 'settlement-item-1',
        settlement_run_id: 'settlement-read-run-1',
        driver_id: 'driver-1',
        amount: '240000.00',
        payout_status: 'ready',
      },
    ],
    latestDriverSettlements: [
      {
        driver_id: 'driver-1',
        driver_name: '천하 기사 1',
        delivery_history_present: true,
        attendance_inferred_from_delivery_history: true,
        latest_settlement: {
          settlement_run_id: 'settlement-read-run-1',
          period_start: '2026-03-01',
          period_end: '2026-03-31',
          status: 'approved',
          payout_status: 'ready',
          amount: '240000.00',
        },
      },
    ],
    dispatchPlans: [
      {
        dispatch_plan_id: 'dispatch-plan-1',
        company_id: cheonhaCompany.company_id,
        fleet_id: cheonhaMainFleet.fleet_id,
        dispatch_date: '2026-03-31',
        planned_volume: 12,
        dispatch_status: 'draft',
        created_at: '2026-03-30T09:00:00Z',
        updated_at: '2026-03-30T09:00:00Z',
      },
    ],
    nextIds: {
      settlementRun: 1,
    },
  };
}

let localSandboxMockState = createInitialState();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function applySettlementRunFilters(
  runs: SettlementRun[],
  searchParams: URLSearchParams,
): SettlementRun[] {
  const companyId = searchParams.get('company_id');
  const fleetId = searchParams.get('fleet_id');

  return runs.filter((run) => {
    if (companyId && run.company_id !== companyId) {
      return false;
    }
    if (fleetId && run.fleet_id !== fleetId) {
      return false;
    }
    return true;
  });
}

function applyDeliveryFilters<T extends { company_id: string; fleet_id: string; status?: string; service_date?: string }>(
  rows: T[],
  searchParams: URLSearchParams,
): T[] {
  const companyId = searchParams.get('company_id');
  const fleetId = searchParams.get('fleet_id');
  const status = searchParams.get('status');
  const serviceDate = searchParams.get('service_date');

  return rows.filter((row) => {
    if (companyId && row.company_id !== companyId) {
      return false;
    }
    if (fleetId && row.fleet_id !== fleetId) {
      return false;
    }
    if (status && row.status !== status) {
      return false;
    }
    if (serviceDate && row.service_date !== serviceDate) {
      return false;
    }
    return true;
  });
}

export function resetLocalSandboxMockState(): void {
  localSandboxMockState = createInitialState();
}

export function resolveLocalSandboxSessionByEmail(email: string): IdentitySessionResponse | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === systemAdminSession.email.toLowerCase()) {
    return clone(localSandboxMockState.sessions[systemAdminSession.accessToken]);
  }
  if (normalizedEmail === cheonhaManagerSession.email.toLowerCase()) {
    return clone(localSandboxMockState.sessions[cheonhaManagerSession.accessToken]);
  }
  return null;
}

export function resolveLocalSandboxSessionByToken(token: string | null | undefined): IdentitySessionResponse | null {
  if (!token) {
    return null;
  }
  return clone(localSandboxMockState.sessions[token] ?? null);
}

export function listLocalSandboxAllowedNavKeys(): string[] {
  return [...allNavItemKeys];
}

export function listLocalSandboxPublicCompanies(): Company[] {
  return clone(localSandboxMockState.publicCompanies);
}

export function listLocalSandboxCompanies(): Company[] {
  return clone(localSandboxMockState.companies);
}

export function listLocalSandboxFleets(): Fleet[] {
  return clone(localSandboxMockState.fleets);
}

export function listLocalSandboxDrivers(searchParams: URLSearchParams): DriverProfile[] {
  const companyId = searchParams.get('company_id');
  const fleetId = searchParams.get('fleet_id');
  const externalUserName = searchParams.get('external_user_name');

  return clone(
    localSandboxMockState.drivers.filter((driver) => {
      if (companyId && driver.company_id !== companyId) {
        return false;
      }
      if (fleetId && driver.fleet_id !== fleetId) {
        return false;
      }
      if (externalUserName && driver.external_user_name !== externalUserName) {
        return false;
      }
      return true;
    }),
  );
}

export function resolveLocalSandboxTenantContext(tenantCode: string): TenantCompanyContext | null {
  return clone(localSandboxMockState.tenantContexts[tenantCode] ?? null);
}

export function resolveLocalSandboxWorkspaceBootstrap(tenantCode: string | null): WorkspaceBootstrapPayload | null {
  if (!tenantCode) {
    return clone(localSandboxMockState.mainWorkspaceBootstrap);
  }
  return clone(localSandboxMockState.tenantWorkspaceBootstraps[tenantCode] ?? null);
}

export function listLocalSandboxDeliveryRecords(searchParams: URLSearchParams): DeliveryRecord[] {
  return clone(applyDeliveryFilters(localSandboxMockState.deliveryRecords, searchParams));
}

export function listLocalSandboxDailySnapshots(searchParams: URLSearchParams): DailyDeliveryInputSnapshot[] {
  return clone(applyDeliveryFilters(localSandboxMockState.dailySnapshots, searchParams));
}

export function listLocalSandboxSettlementRuns(searchParams: URLSearchParams): SettlementRun[] {
  return clone(applySettlementRunFilters(localSandboxMockState.settlementRuns, searchParams));
}

export function createLocalSandboxSettlementRun(
  payload: Omit<SettlementRun, 'settlement_run_id'>,
): SettlementRun {
  const createdRun: SettlementRun = {
    settlement_run_id: `local-sandbox-run-${localSandboxMockState.nextIds.settlementRun}`,
    ...payload,
  };
  localSandboxMockState.nextIds.settlementRun += 1;
  localSandboxMockState.settlementRuns = [...localSandboxMockState.settlementRuns, createdRun];
  return clone(createdRun);
}

export function updateLocalSandboxSettlementRun(
  settlementRunId: string,
  payload: Partial<Omit<SettlementRun, 'settlement_run_id'>>,
): SettlementRun | null {
  const currentRun = localSandboxMockState.settlementRuns.find((run) => run.settlement_run_id === settlementRunId);
  if (!currentRun) {
    return null;
  }

  const updatedRun = { ...currentRun, ...payload };
  localSandboxMockState.settlementRuns = localSandboxMockState.settlementRuns.map((run) =>
    run.settlement_run_id === settlementRunId ? updatedRun : run,
  );
  return clone(updatedRun);
}

export function deleteLocalSandboxSettlementRun(settlementRunId: string): boolean {
  const nextRuns = localSandboxMockState.settlementRuns.filter((run) => run.settlement_run_id !== settlementRunId);
  if (nextRuns.length === localSandboxMockState.settlementRuns.length) {
    return false;
  }
  localSandboxMockState.settlementRuns = nextRuns;
  return true;
}

export function listLocalSandboxSettlementReadRuns(searchParams: URLSearchParams): SettlementRun[] {
  return clone(applySettlementRunFilters(localSandboxMockState.settlementReadRuns, searchParams));
}

export function listLocalSandboxSettlementReadItems(searchParams: URLSearchParams): SettlementItem[] {
  const companyId = searchParams.get('company_id');
  const fleetId = searchParams.get('fleet_id');
  const settlementRunIds = new Set(
    localSandboxMockState.settlementReadRuns
      .filter((run) => {
        if (companyId && run.company_id !== companyId) {
          return false;
        }
        if (fleetId && run.fleet_id !== fleetId) {
          return false;
        }
        return true;
      })
      .map((run) => run.settlement_run_id),
  );

  return clone(
    localSandboxMockState.settlementReadItems.filter((item) => settlementRunIds.has(item.settlement_run_id)),
  );
}

export function listLocalSandboxLatestDriverSettlements(searchParams: URLSearchParams): DriverLatestSettlementPage {
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('page_size') ?? '10');
  const startIndex = Math.max(page - 1, 0) * pageSize;
  const results = localSandboxMockState.latestDriverSettlements.slice(startIndex, startIndex + pageSize);

  return clone({
    count: localSandboxMockState.latestDriverSettlements.length,
    page,
    page_size: pageSize,
    results,
  });
}

export function listLocalSandboxDispatchPlans(searchParams: URLSearchParams): DispatchPlan[] {
  const companyId = searchParams.get('company_id');
  const fleetId = searchParams.get('fleet_id');
  const dispatchDate = searchParams.get('dispatch_date');

  return clone(
    localSandboxMockState.dispatchPlans.filter((plan) => {
      if (companyId && plan.company_id !== companyId) {
        return false;
      }
      if (fleetId && plan.fleet_id !== fleetId) {
        return false;
      }
      if (dispatchDate && plan.dispatch_date !== dispatchDate) {
        return false;
      }
      return true;
    }),
  );
}
