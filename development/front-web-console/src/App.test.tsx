import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { login as loginApi } from './api/auth';
import { ApiError, GENERIC_SERVER_ERROR_MESSAGE } from './api/http';
import { loadStoredSession } from './sessionPersistence';
import { listPublicCompanies } from './api/organization';
import { listVehicleMasters } from './api/vehicles';
import { resolveTenantEntry } from './tenant/resolveTenantEntry';

const session = {
  accessToken: 'token',
  sessionKind: 'normal',
  email: 'system-admin@example.com',
  identity: {
    identityId: '10000000-0000-0000-0000-000000000001',
    name: '관리자',
    birthDate: '1990-01-01',
    status: 'active',
  },
  activeAccount: {
    accountType: 'system_admin' as const,
    accountId: '20000000-0000-0000-0000-000000000001',
    companyId: null,
    roleType: null,
  },
  availableAccountTypes: ['system_admin'],
};

const companyManagerSession = {
  ...session,
  email: 'manager@example.com',
  activeAccount: {
    accountType: 'manager' as const,
    accountId: '20000000-0000-0000-0000-000000000010',
    companyId: '30000000-0000-0000-0000-000000000010',
    roleType: 'company_super_admin',
  },
  availableAccountTypes: ['manager'],
};

async function withHostname<T>(url: string, run: () => Promise<T>): Promise<T> {
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL(url),
  });

  try {
    return await run();
  } finally {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  }
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

vi.mock('./sessionPersistence', () => ({
  clearStoredSession: vi.fn(),
  loadStoredSession: vi.fn(() => session),
  persistSession: vi.fn(),
}));

vi.mock('./api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  signupRequestIntake: vi.fn(),
}));

vi.mock('./api/organization', () => ({
  listCompanies: vi.fn().mockResolvedValue([
    { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
  ]),
  listFleets: vi.fn().mockResolvedValue([
    {
      fleet_id: '40000000-0000-0000-0000-000000000001',
      route_no: 1,
      company_id: '30000000-0000-0000-0000-000000000001',
      name: 'Seed Fleet',
    },
  ]),
  listPublicCompanies: vi.fn().mockResolvedValue([]),
  getFleet: vi.fn().mockResolvedValue({
    fleet_id: '40000000-0000-0000-0000-000000000001',
    route_no: 1,
    company_id: '30000000-0000-0000-0000-000000000001',
    name: 'Seed Fleet',
  }),
}));

vi.mock('./api/settlementOps', () => ({
  listSettlementReadRuns: vi.fn().mockResolvedValue([]),
  listSettlementReadItems: vi.fn().mockResolvedValue([]),
  getDriverLatestSettlement: vi.fn().mockResolvedValue(null),
}));

vi.mock('./api/dispatchOps', () => ({
  getDispatchBoard: vi.fn().mockResolvedValue([]),
  getDispatchSummary: vi.fn().mockResolvedValue({
    dispatch_date: '2026-03-24',
    fleet_id: '40000000-0000-0000-0000-000000000001',
    planned_volume: 0,
    planned_assignment_count: 0,
    matched_count: 0,
    not_started_count: 0,
    dispatch_unit_changed_count: 0,
    unplanned_current_count: 0,
  }),
}));

vi.mock('./api/dispatchRegistry', () => ({
  listDispatchPlans: vi.fn().mockResolvedValue([]),
  listDispatchUploadBatches: vi.fn().mockResolvedValue([]),
  previewDispatchUpload: vi.fn(),
  confirmDispatchUpload: vi.fn(),
  listDispatchAssignments: vi.fn().mockResolvedValue([]),
  createDispatchAssignment: vi.fn(),
  updateDispatchAssignment: vi.fn(),
  listDispatchWorkRules: vi.fn().mockResolvedValue([]),
  createDispatchWorkRule: vi.fn(),
  updateDispatchWorkRule: vi.fn(),
  removeDispatchWorkRule: vi.fn(),
  listDriverDayExceptions: vi.fn().mockResolvedValue([]),
  createDriverDayException: vi.fn(),
  removeDriverDayException: vi.fn(),
  listOutsourcedDrivers: vi.fn().mockResolvedValue([]),
  createOutsourcedDriver: vi.fn(),
  archiveOutsourcedDriver: vi.fn(),
  updateOutsourcedDriver: vi.fn(),
  listVehicleSchedules: vi.fn().mockResolvedValue([]),
  createDispatchPlan: vi.fn(),
  getDispatchPlan: vi.fn(),
  updateDispatchPlan: vi.fn(),
}));

vi.mock('./api/vehicles', () => ({
  listVehicleMasters: vi.fn().mockResolvedValue([]),
}));

vi.mock('./tenant/resolveTenantEntry', () => ({
  resolveTenantEntry: vi.fn(),
}));

vi.mock('./api/driverAccountLinks', () => ({
  listDriverAccountLinks: vi.fn().mockResolvedValue([]),
  createDriverAccountLink: vi.fn(),
  unlinkDriverAccountLink: vi.fn(),
}));

vi.mock('./api/settlementRegistry', () => ({
  getSettlementConfigMetadata: vi.fn().mockResolvedValue({
    sections: [
      {
        key: 'tax_rates',
        title: '세율',
        description: '정산 산출에 적용되는 세금율입니다.',
        fields: [
          {
            key: 'income_tax_rate',
            label: '소득세율',
            description: '과세 기준 소득세율',
            input_type: 'percent',
            unit: '%',
            min: '0.0000',
            max: '100.0000',
            decimal_precision: 4,
            required: true,
          },
        ],
      },
    ],
  }),
  getSettlementConfig: vi.fn().mockResolvedValue({
    singleton_key: 'global',
    income_tax_rate: '0.0000',
    vat_tax_rate: '0.0000',
    reported_amount_rate: '0.0000',
    national_pension_rate: '0.0000',
    health_insurance_rate: '0.0000',
    medical_insurance_rate: '0.0000',
    employment_insurance_rate: '0.0000',
    industrial_accident_insurance_rate: '0.0000',
    special_employment_insurance_rate: '0.0000',
    special_industrial_accident_insurance_rate: '0.0000',
    two_insurance_min_settlement_amount: '0.0000',
    meal_allowance: '0.0000',
  }),
  updateSettlementConfig: vi.fn(),
  listSettlementPricingTables: vi.fn().mockResolvedValue([]),
  listSettlementPolicies: vi.fn(),
  createSettlementPolicy: vi.fn(),
  updateSettlementPolicy: vi.fn(),
  deleteSettlementPolicy: vi.fn(),
  listSettlementPolicyVersions: vi.fn(),
  createSettlementPolicyVersion: vi.fn(),
  updateSettlementPolicyVersion: vi.fn(),
  deleteSettlementPolicyVersion: vi.fn(),
  listSettlementPolicyAssignments: vi.fn(),
  createSettlementPolicyAssignment: vi.fn(),
  updateSettlementPolicyAssignment: vi.fn(),
  deleteSettlementPolicyAssignment: vi.fn(),
}));

vi.mock('./api/settlements', () => ({
  listSettlementRuns: vi.fn().mockResolvedValue([]),
  createSettlementRun: vi.fn(),
  updateSettlementRun: vi.fn(),
  deleteSettlementRun: vi.fn(),
  listSettlementItems: vi.fn().mockResolvedValue([]),
  createSettlementItem: vi.fn(),
  updateSettlementItem: vi.fn(),
  deleteSettlementItem: vi.fn(),
}));

vi.mock('./api/deliveryRecords', () => ({
  listDeliveryRecords: vi.fn().mockResolvedValue([]),
  createDeliveryRecord: vi.fn(),
  updateDeliveryRecord: vi.fn(),
  deleteDeliveryRecord: vi.fn(),
  listDailyDeliveryInputSnapshots: vi.fn().mockResolvedValue([]),
  createDailyDeliveryInputSnapshot: vi.fn(),
  updateDailyDeliveryInputSnapshot: vi.fn(),
  deleteDailyDeliveryInputSnapshot: vi.fn(),
  bootstrapDailySnapshotsFromDispatch: vi.fn(),
}));

vi.mock('./api/personnelDocuments', () => ({
  listPersonnelDocuments: vi.fn().mockResolvedValue([]),
  getPersonnelDocument: vi.fn(),
  createPersonnelDocument: vi.fn(),
  updatePersonnelDocument: vi.fn(),
}));

vi.mock('./api/drivers', async () => {
  const actual = await vi.importActual<typeof import('./api/drivers')>('./api/drivers');
  return {
    ...actual,
    listDrivers: vi.fn().mockResolvedValue([]),
    getDriver: vi.fn(),
  };
});

vi.mock('./api/regions', () => ({
  listRegions: vi.fn().mockResolvedValue([]),
  getRegionByCode: vi.fn().mockResolvedValue({
    region_id: '10000000-0000-0000-0000-000000000011',
    region_code: 'SEOUL-A',
    name: '서울 A 권역',
    status: 'active',
    difficulty_level: 'high',
    polygon_geojson: { type: 'Polygon', coordinates: [] },
    description: '',
    display_order: 1,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  }),
  createRegion: vi.fn(),
  updateRegion: vi.fn(),
  listRegionDailyStatistics: vi.fn().mockResolvedValue([]),
  listRegionPerformanceSummaries: vi.fn().mockResolvedValue([]),
}));

describe('Admin App', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    vi.mocked(loadStoredSession).mockReturnValue(session);
    vi.mocked(resolveTenantEntry).mockReturnValue(null);
    vi.mocked(loginApi).mockReset();
    vi.mocked(listVehicleMasters).mockResolvedValue([]);
    vi.stubEnv('MODE', 'test');
  });

  it('uses the unified dashboard as the root route', async () => {
    render(<App />);

    expect(await screen.findByText('운영 요약')).toBeInTheDocument();
  });

  it('keeps the main-domain IA anchors intact', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '정산' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '조직 관리' }));
    expect(screen.getByRole('link', { name: '회사' })).toBeInTheDocument();
  });

  it('rejects a company manager session on the main domain before rendering the admin shell', async () => {
    await withHostname('https://ev-dashboard.com/', async () => {
      vi.mocked(loadStoredSession).mockReturnValue(companyManagerSession);
      vi.mocked(resolveTenantEntry).mockReturnValue(null);

      window.history.replaceState({}, '', '/');
      render(<App />);

      expect(window.location.hostname).toBe('ev-dashboard.com');
      expect(screen.getByRole('heading', { name: '도메인 접근 권한 필요' })).toBeInTheDocument();
      expect(screen.getByText('메인 도메인은 시스템 관리자 계정만 사용할 수 있습니다.')).toBeInTheDocument();
      expect(screen.queryByText('운영 요약')).not.toBeInTheDocument();
      expect(screen.queryByText('CLEVER 통합 웹 콘솔')).not.toBeInTheDocument();
    });
  });

  it('redirects removed /notifications to the dashboard root', async () => {
    window.history.replaceState({}, '', '/notifications');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(await screen.findByText('운영 요약')).toBeInTheDocument();
  });

  it('redirects main-domain /vehicles/home to the vehicle list instead of treating home as a vehicleRef', async () => {
    window.history.replaceState({}, '', '/vehicles/home');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/vehicles'));
    expect(await screen.findByRole('heading', { name: '차량' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '차량 상세' })).not.toBeInTheDocument();
  });

  it('renders personnel documents route inside the unified console', async () => {
    window.history.replaceState({}, '', '/personnel-documents');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '인사문서 목록' })).toBeInTheDocument();
  });

  it('renders the region list route inside the single web console', async () => {
    window.history.replaceState({}, '', '/regions');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '권역 목록' })).toBeInTheDocument();
  });

  it('renders the manager roles route for company super admin', async () => {
    window.history.replaceState({}, '', '/admin/manager-roles');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '관리자 역할' })).toBeInTheDocument();
  });

  it('redirects legacy /account to canonical /me', async () => {
    window.history.replaceState({}, '', '/account');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/me'));
  });

  it('redirects legacy /accounts to canonical /admin/account-requests', async () => {
    window.history.replaceState({}, '', '/accounts');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/admin/account-requests'));
  });

  it('redirects legacy menu policy routes to canonical admin/company routes', async () => {
    window.history.replaceState({}, '', '/admin/navigation-policy');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/admin/menu-policy'));

    window.history.replaceState({}, '', '/company/navigation-policy');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/company/menu-policy'));
  });

  it('redirects /settlements to the standalone overview entry', async () => {
    window.history.replaceState({}, '', '/settlements');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/settlements/overview'));
  });

  it('renders the standalone dispatch upload route', async () => {
    window.history.replaceState({}, '', '/dispatch/uploads');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
  });

  it('renders settlement overview without process tabs or context selectors', async () => {
    window.history.replaceState({}, '', '/settlements/overview');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '정산 실행 조회' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '정산 기준' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '회사' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '플릿' })).not.toBeInTheDocument();
  });

  it('renders settlement process routes with process tabs and context selectors', async () => {
    window.history.replaceState({}, '', '/settlements/criteria');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '정산 처리' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산 기준' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산 입력' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산 실행' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정산 결과' })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox', { name: '회사' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('combobox', { name: '플릿' }).length).toBeGreaterThan(0);
  });

  it('redirects to the dashboard root after login regardless of the entry route', async () => {
    const user = userEvent.setup();
    vi.mocked(loadStoredSession).mockReturnValue(null);
    vi.mocked(loginApi).mockResolvedValue(session);
    window.history.replaceState({}, '', '/settlements/results');

    render(<App />);

    await user.type(screen.getByLabelText(/아이디/i), 'manager@example.com');
    await user.type(screen.getByLabelText(/비밀번호/i), 'change-me');
    await user.click(screen.getByRole('button', { name: /^로그인$/i }));

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(await screen.findByText('운영 요약')).toBeInTheDocument();
  });

  it('lets users move to another tab after the post-login redirect has completed', async () => {
    const user = userEvent.setup();
    vi.mocked(loadStoredSession).mockReturnValue(null);
    vi.mocked(loginApi).mockResolvedValue(session);
    window.history.replaceState({}, '', '/settlements/results');

    render(<App />);

    await user.type(screen.getByLabelText(/아이디/i), 'manager@example.com');
    await user.type(screen.getByLabelText(/비밀번호/i), 'change-me');
    await user.click(screen.getByRole('button', { name: /^로그인$/i }));

    expect(await screen.findByText('운영 요약')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '배송원' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '배송원' }));
    await user.click(screen.getByRole('link', { name: '배송원' }));

    await waitFor(() => expect(window.location.pathname).toBe('/drivers'));
    expect(await screen.findByRole('heading', { name: '배송원' })).toBeInTheDocument();
  });

  it('normalizes the browser URL to the root route while showing the login screen', async () => {
    vi.mocked(loadStoredSession).mockReturnValue(null);
    window.history.replaceState({}, '', '/settlements/overview');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('re-fetches navigation policy after a route permission error and updates the available tabs without a refresh', async () => {
    const user = userEvent.setup();
    let navigationPolicyRequestCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/auth/identity-navigation-policy/')) {
        navigationPolicyRequestCount += 1;
        return jsonResponse({
          allowed_nav_keys:
            navigationPolicyRequestCount === 1
              ? ['dashboard', 'account', 'vehicles', 'drivers']
              : ['dashboard', 'account', 'drivers'],
          source: navigationPolicyRequestCount === 1 ? 'initial-policy' : 'updated-policy',
        });
      }

      if (url.endsWith('/api/vehicles/vehicle-masters/')) {
        return new Response(
          JSON.stringify({
            code: 'nav_policy_denied',
            message: 'This API is not allowed by current navigation policy.',
            details: {},
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      }

      throw new Error(`Unexpected fetch request in test: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(listVehicleMasters).mockImplementationOnce((client) =>
      client.request('/vehicles/vehicle-masters/'),
    );
    window.history.replaceState({}, '', '/vehicles');

    render(<App />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(await screen.findByText('운영 요약')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '차량' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배송원' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '배송원' }));
    await user.click(screen.getByRole('link', { name: '배송원' }));

    await waitFor(() => expect(window.location.pathname).toBe('/drivers'));
    expect(await screen.findByRole('heading', { name: '배송원' })).toBeInTheDocument();
  });

  it('renders the local-only /block route and previews both top notice tones', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/block');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '상단 알림 미리보기' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '일반 알림 미리보기' }));
    const successNotice = await screen.findByText('정상 흐름 로그 예시입니다. 상단 알림 템플릿을 확인하세요.');
    expect(successNotice.closest('.top-notice')).toHaveAttribute('data-tone', 'success');

    await user.click(screen.getByRole('button', { name: '오류 알림 미리보기' }));
    const errorNotice = await screen.findByText('오류로 인해 허용된 화면으로 이동했습니다. 상단 알림 템플릿을 확인하세요.');
    expect(errorNotice.closest('.top-notice')).toHaveAttribute('data-tone', 'error');
  });

  it('promotes generic server errors to the top notification bar instead of keeping them visible inline', async () => {
    vi.mocked(loadStoredSession).mockReturnValue(null);
    vi.mocked(listPublicCompanies).mockRejectedValue(
      new ApiError(502, 'http_502', 'Bad Gateway', null),
    );
    window.history.replaceState({}, '', '/');

    render(<App />);

    const topNotice = await screen.findByRole('alert');
    expect(topNotice).toHaveTextContent(GENERIC_SERVER_ERROR_MESSAGE);
    expect(topNotice).toHaveAttribute('data-tone', 'error');
    expect(document.querySelector('.error-banner.is-suppressed-by-top-notice')).not.toBeNull();
  });

  it('does not expose the dev session route outside local-sandbox mode', async () => {
    window.history.replaceState({}, '', '/__dev__/session');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByRole('button', { name: '세션 주입' })).not.toBeInTheDocument();
    expect(screen.queryByText('현재 host')).not.toBeInTheDocument();
  });

  it('renders the dev session route only in local-sandbox mode', async () => {
    vi.stubEnv('MODE', 'local-sandbox');
    window.history.replaceState({}, '', '/__dev__/session');

    render(<App />);

    expect(await screen.findByRole('button', { name: '세션 주입' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '세션 초기화' })).toBeInTheDocument();
  });
});
