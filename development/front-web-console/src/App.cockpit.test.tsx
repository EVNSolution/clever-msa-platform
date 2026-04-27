import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { loadStoredSession } from './sessionPersistence';
import { resolvePublicCompanyTenant } from './api/companyTenant';
import { ApiError } from './api/http';
import { getWorkspaceBootstrap } from './api/workspaceBootstrap';
import type { NavItemKey } from './authScopes';
import { useNavigationPolicyWithRefresh } from './hooks/useNavigationPolicy';
import { resolveTenantEntry } from './tenant/resolveTenantEntry';

const session = {
  accessToken: 'token',
  sessionKind: 'normal',
  email: 'manager@example.com',
  identity: {
    identityId: '10000000-0000-0000-0000-000000000001',
    name: '관리자',
    birthDate: '1990-01-01',
    status: 'active',
  },
  activeAccount: {
    accountType: 'manager' as const,
    accountId: '20000000-0000-0000-0000-000000000001',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'settlement_manager',
    roleDisplayName: '정산 관리자',
  },
  availableAccountTypes: ['manager'],
};

const systemAdminSession = {
  ...session,
  email: 'system-admin@example.com',
  activeAccount: {
    accountType: 'system_admin' as const,
    accountId: '20000000-0000-0000-0000-000000000002',
    companyId: null,
    roleType: null,
  },
  availableAccountTypes: ['system_admin'],
};

const wrongCompanySession = {
  ...session,
  activeAccount: {
    ...session.activeAccount,
    companyId: '30000000-0000-0000-0000-000000000099',
  },
};

const vehicleSession = {
  ...session,
  activeAccount: {
    ...session.activeAccount,
    roleType: 'vehicle_manager' as const,
    roleDisplayName: '차량 관리자',
  },
};

const cockpitBootstrap = {
  companyId: '30000000-0000-0000-0000-000000000001',
  companyName: '천하운수',
  tenantCode: 'cheonha',
  workflowProfile: 'cheonha_ops_v1',
  enabledFeatures: ['settlement', 'vehicle'],
  homeDashboardPreset: {},
  workspacePresets: {},
};

function setupCompanyCockpit({
  pathname = '/',
  sessionValue = session,
  bootstrap = cockpitBootstrap,
}: {
  pathname?: string;
  sessionValue?:
    | typeof session
    | typeof systemAdminSession
    | typeof wrongCompanySession
    | typeof vehicleSession
    | null;
  bootstrap?: typeof cockpitBootstrap;
} = {}) {
  vi.mocked(loadStoredSession).mockReturnValue(sessionValue);
  vi.mocked(resolvePublicCompanyTenant).mockResolvedValue(bootstrap);
  vi.mocked(getWorkspaceBootstrap).mockResolvedValue(bootstrap);
  const allowedNavKeys: NavItemKey[] =
    sessionValue?.activeAccount?.roleType === 'vehicle_manager'
      ? ['dashboard', 'account', 'vehicles', 'vehicle_assignments', 'drivers']
      : ['dashboard', 'account'];
  vi.mocked(useNavigationPolicyWithRefresh).mockReturnValue({
    allowedNavKeys,
    isLoading: false,
    errorMessage: null,
    source: 'test',
  });
  window.history.replaceState({}, '', pathname);
}

vi.mock('./sessionPersistence', () => ({
  clearStoredSession: vi.fn(),
  loadStoredSession: vi.fn(),
  persistSession: vi.fn(),
}));

vi.mock('./api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  signupRequestIntake: vi.fn(),
}));

vi.mock('./api/organization', () => ({
  listPublicCompanies: vi.fn().mockResolvedValue([]),
  listCompanies: vi.fn().mockResolvedValue([]),
  listFleets: vi.fn().mockResolvedValue([
    {
      fleet_id: 'fleet-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      name: '천하 메인 플릿',
    },
  ]),
}));

vi.mock('./api/companyTenant', () => ({
  resolvePublicCompanyTenant: vi.fn(),
}));

vi.mock('./api/workspaceBootstrap', () => ({
  getWorkspaceBootstrap: vi.fn(),
}));

vi.mock('./tenant/resolveTenantEntry', () => ({
  resolveTenantEntry: vi.fn(),
}));

vi.mock('./hooks/useNavigationPolicy', () => ({
  useNavigationPolicyWithRefresh: vi.fn(),
}));

vi.mock('./pages/AccountPage', () => ({
  AccountPage: () => (
    <section>
      <h2>내 계정</h2>
      <p>cockpit account surface</p>
    </section>
  ),
}));

vi.mock('./pages/SettlementInputsPage', () => ({
  SettlementInputsPage: () => (
    <section>
      <h2>정산 입력 요약</h2>
      <p>cockpit alias surface</p>
    </section>
  ),
}));

vi.mock('./pages/DispatchUploadsPage', () => ({
  DispatchUploadsPage: () => (
    <section>
      <h2>배차표 업로드</h2>
      <p>cockpit dispatch surface</p>
    </section>
  ),
}));

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

describe('App cockpit entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    vi.mocked(resolveTenantEntry).mockReturnValue({
      type: 'company',
      tenantCode: 'cheonha',
      host: 'cheonha.ev-dashboard.com',
      source: 'host',
      basePath: '',
    });
  });

  it('keeps the company login path while showing the tenant login screen on the apex domain', async () => {
    vi.mocked(loadStoredSession).mockReturnValue(null);
    vi.mocked(resolveTenantEntry).mockReturnValue({
      type: 'company',
      tenantCode: 'cheonha',
      host: 'ev-dashboard.com',
      source: 'path',
      basePath: '/cheonha',
    });
    vi.mocked(resolvePublicCompanyTenant).mockResolvedValue(cockpitBootstrap);

    window.history.replaceState({}, '', '/cheonha/login');
    render(<App />);

    expect(await screen.findByText('천하운수')).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/cheonha/login'));
  });

  it('normalizes an unauthenticated company deep link to the tenant login path on the apex domain', async () => {
    vi.mocked(loadStoredSession).mockReturnValue(null);
    vi.mocked(resolveTenantEntry).mockReturnValue({
      type: 'company',
      tenantCode: 'cheonha',
      host: 'ev-dashboard.com',
      source: 'path',
      basePath: '/cheonha',
    });
    vi.mocked(resolvePublicCompanyTenant).mockResolvedValue(cockpitBootstrap);

    window.history.replaceState({}, '', '/cheonha/settlement/home');
    render(<App />);

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/cheonha/login'));
  });

  it('renders company workspace routes under the tenant path basename on the apex domain', async () => {
    vi.mocked(resolveTenantEntry).mockReturnValue({
      type: 'company',
      tenantCode: 'cheonha',
      host: 'ev-dashboard.com',
      source: 'path',
      basePath: '/cheonha',
    });
    setupCompanyCockpit({ pathname: '/cheonha/settlement/home' });

    render(<App />);

    expect((await screen.findAllByRole('heading', { name: '천하운수 정산' })).length).toBeGreaterThan(0);
    await waitFor(() => expect(window.location.pathname).toBe('/cheonha/settlement/home'));
  });

  it('lands the company shell root on the empty cockpit dashboard shell', async () => {
    setupCompanyCockpit();
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });

    expect(await screen.findByText('CLEVER')).toBeInTheDocument();
    expect(await screen.findByText('EV&Solution')).toBeInTheDocument();
    expect(await screen.findByText('천하운수')).toBeInTheDocument();
    expect(screen.queryByText('전용 업무 cockpit')).not.toBeInTheDocument();
    const main = await screen.findByRole('main');
    const shell = main.closest('.cockpit-shell');
    expect(main).toBeInTheDocument();
    expect(shell).toHaveClass('cockpit-shell-no-dashboard-sidebar');
    expect(shell).not.toHaveClass('cockpit-shell-settlement');
    expect(screen.queryByText('천하운수 운영 대시보드')).not.toBeInTheDocument();
  });

  it('dashboard body no longer shows the old finance/attendance/dispatch sections', async () => {
    setupCompanyCockpit();
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });

    expect(screen.getByTestId('subdomain-primary-menu-surface')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '상위 메뉴 열기' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '알림' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '계정 메뉴' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '정산' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '정산 메뉴' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '홈' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '최근 6개월 수입/지출' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '금월 배차표 기반 근태' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '금일 배차' })).not.toBeInTheDocument();
    expect(
      screen.queryByText('오늘 운영 현황을 우선으로 보고, 월 기준 전환으로 최근 흐름을 함께 확인합니다.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('기준: 오늘')).not.toBeInTheDocument();
    expect(screen.queryByText('데이터 미연동')).not.toBeInTheDocument();
  });

  it('opens the cockpit alerts panel from the shared header', async () => {
    const user = userEvent.setup();

    setupCompanyCockpit();
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });

    await user.click(await screen.findByRole('button', { name: '알림' }));

    const panel = await screen.findByRole('dialog', { name: '알림 패널' });
    expect(within(panel).getByText('알림이 없습니다')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: '모두 읽음' })).toBeInTheDocument();
  });

  it('opens the cockpit account menu and routes to 내 정보 inside the company shell', async () => {
    const user = userEvent.setup();

    setupCompanyCockpit();
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });

    await user.click(await screen.findByRole('button', { name: '계정 메뉴' }));

    const menu = await screen.findByRole('menu', { name: '계정 메뉴 패널' });
    expect(within(menu).getByText('manager@example.com')).toBeInTheDocument();
    expect(within(menu).getByText('관리자')).toBeInTheDocument();
    expect(within(menu).getByText('정산 관리자')).toBeInTheDocument();

    await user.click(within(menu).getByRole('link', { name: '내 정보' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/me');
    });
    expect(await screen.findByRole('heading', { name: '내 계정' })).toBeInTheDocument();
    expect(screen.getByText('cockpit account surface')).toBeInTheDocument();
  });

  it('logs out from the cockpit account menu instead of the left rail footer', async () => {
    const user = userEvent.setup();

    setupCompanyCockpit();
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });

    await user.click(await screen.findByRole('button', { name: '계정 메뉴' }));
    await user.click(await screen.findByRole('button', { name: '로그아웃' }));

    expect(await screen.findByText('회사 전용 로그인')).toBeInTheDocument();
    expect(screen.getByText('천하운수 전용 콘솔')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument();
  });

  it('/settlement redirects to /settlement/home', async () => {
    setupCompanyCockpit({ pathname: '/settlement' });
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });
    await screen.findByTestId('settlement-workspace-frame');
    expect(screen.queryByTestId('settlement-workspace-header')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: '천하운수 정산' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/settlement/home');
  });

  it('/settlement/home resolves under the company cockpit settlement landing path', async () => {
    setupCompanyCockpit({ pathname: '/settlement/home' });
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });
    await screen.findByTestId('settlement-workspace-frame');
    expect(screen.queryByTestId('settlement-workspace-header')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: '천하운수 정산' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/settlement/home');
    expect(screen.getByText('CLEVER')).toBeInTheDocument();
    expect(screen.getByText('EV&Solution')).toBeInTheDocument();
    expect(screen.getByText('천하운수')).toBeInTheDocument();

    expect(screen.getByTestId('subdomain-settlement-sidebar')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '정산 메뉴' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: '천하운수 정산' })).toHaveLength(1);
  });

  it('routes from the cockpit launcher to the vehicle workspace shell', async () => {
    const user = userEvent.setup();

    setupCompanyCockpit();
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });

    await user.click(screen.getByRole('button', { name: '상위 메뉴 열기' }));
    await user.click(within(screen.getByRole('navigation', { name: '서브도메인 메뉴' })).getByRole('link', { name: '차량' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/vehicles/home');
    });

    expect(screen.getByRole('navigation', { name: '차량 메뉴' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '정산 메뉴' })).not.toBeInTheDocument();
  });

  it.each([
    ['/drivers', '배송원 현황'],
    ['/vehicles', '차량'],
    ['/vehicle-assignments', '차량 배정'],
  ])('renders %s under the company cockpit vehicle shell', async (pathname, heading) => {
    setupCompanyCockpit({ pathname, sessionValue: vehicleSession });
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe(pathname);
    });

    expect(await screen.findByRole('navigation', { name: '차량 메뉴' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '정산 메뉴' })).not.toBeInTheDocument();
    expect(screen.getByRole('main').closest('.cockpit-shell')).toHaveClass('cockpit-shell-vehicle');
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('redirects a restricted company-manager deep link away from blocked vehicle routes in the cockpit shell', async () => {
    setupCompanyCockpit({ pathname: '/drivers' });
    vi.mocked(useNavigationPolicyWithRefresh).mockReturnValue({
      allowedNavKeys: ['dashboard'],
      isLoading: false,
      errorMessage: null,
      source: 'test',
    });
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '배송원' })).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: '차량 메뉴' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('main').closest('.cockpit-shell')).toHaveClass('cockpit-shell-no-dashboard-sidebar');
  });

  it('returning to / removes the settlement sidebar but preserves the top-level menu state', async () => {
    const user = userEvent.setup();

    setupCompanyCockpit();
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });

    const settlementButton = await screen.findByRole('button', { name: '상위 메뉴 열기' });

    await user.click(settlementButton);
    expect(screen.getByRole('button', { name: '상위 메뉴 닫기' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('navigation', { name: '서브도메인 메뉴' })).getAllByRole('link')).toHaveLength(3);

    await user.click(screen.getByRole('link', { name: '정산' }));
    expect(await screen.findByRole('navigation', { name: '정산 메뉴' })).toBeInTheDocument();
    await screen.findByTestId('settlement-workspace-frame');
    expect(screen.queryByTestId('settlement-workspace-header')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: '천하운수 정산' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '상위 메뉴 닫기' })).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('link', { name: '대시보드' }));
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
    expect(screen.queryByRole('navigation', { name: '정산 메뉴' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '상위 메뉴 닫기' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('navigation', { name: '서브도메인 메뉴' })).getAllByRole('link')).toHaveLength(3);
  });

  it('fails closed on removed /settlements aliases in the cockpit shell', async () => {
    setupCompanyCockpit({ pathname: '/settlements/inputs' });
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
      expect(window.location.pathname).toBe('/');
    });
    expect(screen.queryByText('cockpit alias surface')).not.toBeInTheDocument();
    expect(screen.queryByText('천하운수 운영 대시보드')).not.toBeInTheDocument();
  });

  it('keeps the company shell from exposing a top-level dispatch route', async () => {
    setupCompanyCockpit({ pathname: '/dispatch' });
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });
    expect(window.location.pathname).toBe('/');
    expect(screen.queryByText('배차 관리 권한 필요')).not.toBeInTheDocument();
    expect(screen.queryByText('천하운수 운영 대시보드')).not.toBeInTheDocument();
  });

  it('keeps the company shell from exposing other legacy top-level workspace routes', async () => {
    vi.mocked(loadStoredSession).mockReturnValue(session);
    vi.mocked(resolvePublicCompanyTenant).mockResolvedValue({
      companyId: '30000000-0000-0000-0000-000000000001',
      companyName: '천하운수',
      tenantCode: 'cheonha',
      workflowProfile: 'cheonha_ops_v1',
      enabledFeatures: ['settlement', 'vehicle'],
      homeDashboardPreset: {},
      workspacePresets: {},
    });
    vi.mocked(getWorkspaceBootstrap).mockResolvedValue({
      companyId: '30000000-0000-0000-0000-000000000001',
      companyName: '천하운수',
      tenantCode: 'cheonha',
      workflowProfile: 'cheonha_ops_v1',
      enabledFeatures: ['settlement', 'vehicle'],
      homeDashboardPreset: {},
      workspacePresets: {},
    });

    window.history.replaceState({}, '', '/vehicle');
    render(<App />);

    await waitFor(() => {
      expect(resolvePublicCompanyTenant).toHaveBeenCalledWith('cheonha');
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
    expect(screen.queryByText('천하운수 운영 대시보드')).not.toBeInTheDocument();
  });

  it('blocks unknown company hosts after public resolve instead of opening the generic shell', async () => {
    const actualTenantModule = await vi.importActual<typeof import('./tenant/resolveTenantEntry')>(
      './tenant/resolveTenantEntry',
    );
    vi.mocked(loadStoredSession).mockReturnValue(session);

    await withHostname('https://unknown.ev-dashboard.com/', async () => {
      vi.mocked(resolveTenantEntry).mockImplementation(actualTenantModule.resolveTenantEntry);
      vi.mocked(resolvePublicCompanyTenant).mockRejectedValue(new ApiError(404, 'company_not_found', 'missing', {}));

      window.history.replaceState({}, '', '/');
      render(<App />);

      expect(await screen.findByText('존재하지 않는 회사 경로입니다.')).toBeInTheDocument();
      expect(screen.queryByText('회사 전용 로그인')).not.toBeInTheDocument();
      expect(screen.queryByText(/전용 콘솔$/)).not.toBeInTheDocument();
      expect(getWorkspaceBootstrap).not.toHaveBeenCalled();
    });
  });

  it('blocks unknown company hosts before rendering the generic login shell when signed out', async () => {
    const actualTenantModule = await vi.importActual<typeof import('./tenant/resolveTenantEntry')>(
      './tenant/resolveTenantEntry',
    );
    vi.mocked(loadStoredSession).mockReturnValue(null);

    await withHostname('https://unknown.ev-dashboard.com/', async () => {
      vi.mocked(resolveTenantEntry).mockImplementation(actualTenantModule.resolveTenantEntry);
      vi.mocked(resolvePublicCompanyTenant).mockRejectedValue(new ApiError(404, 'company_not_found', 'missing', {}));

      window.history.replaceState({}, '', '/');
      render(<App />);

      expect(await screen.findByText('존재하지 않는 회사 경로입니다.')).toBeInTheDocument();
      expect(screen.queryByText('회사 전용 로그인')).not.toBeInTheDocument();
      expect(screen.queryByText(/전용 콘솔$/)).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: '로그인' })).not.toBeInTheDocument();
      expect(getWorkspaceBootstrap).not.toHaveBeenCalled();
    });
  });

  it('shows a retryable resolve error instead of treating non-404 tenant resolve failures as not found', async () => {
    const actualTenantModule = await vi.importActual<typeof import('./tenant/resolveTenantEntry')>(
      './tenant/resolveTenantEntry',
    );
    vi.mocked(loadStoredSession).mockReturnValue(null);

    await withHostname('https://cheonha.ev-dashboard.com/', async () => {
      vi.mocked(resolveTenantEntry).mockImplementation(actualTenantModule.resolveTenantEntry);
      vi.mocked(resolvePublicCompanyTenant).mockRejectedValue(
        new ApiError(503, 'service_unavailable', 'tenant service unavailable', {}),
      );

      window.history.replaceState({}, '', '/');
      render(<App />);

      expect(await screen.findByText('회사 문맥을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
      expect(screen.queryByText('존재하지 않는 회사 경로입니다.')).not.toBeInTheDocument();
      expect(getWorkspaceBootstrap).not.toHaveBeenCalled();
    });
  });

  it('hides company search and select in signup for tenant subdomains', async () => {
    const user = userEvent.setup();
    vi.mocked(loadStoredSession).mockReturnValue(null);
    vi.mocked(resolvePublicCompanyTenant).mockResolvedValue({
      companyId: '30000000-0000-0000-0000-000000000001',
      companyName: '천하운수',
      tenantCode: 'cheonha',
      workflowProfile: 'cheonha_ops_v1',
      enabledFeatures: ['settlement'],
      homeDashboardPreset: {},
      workspacePresets: {},
    });

    render(<App />);

    expect(await screen.findByText('천하운수')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '천하운수' })).not.toBeInTheDocument();
    expect(screen.getByText('회사 전용 로그인')).toBeInTheDocument();
    expect(screen.getByText('천하운수 전용 콘솔')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => {
      expect(screen.getByText('회원가입 요청은 이 회사 전용 문맥으로 접수됩니다.')).toBeInTheDocument();
      expect(screen.queryByLabelText('회사 검색')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('회사 선택')).not.toBeInTheDocument();
    });
  });

  it('keeps the main-domain signed-out entry generic', async () => {
    const actualTenantModule = await vi.importActual<typeof import('./tenant/resolveTenantEntry')>(
      './tenant/resolveTenantEntry',
    );
    vi.mocked(loadStoredSession).mockReturnValue(null);

    await withHostname('https://ev-dashboard.com/', async () => {
      vi.mocked(resolveTenantEntry).mockImplementation(actualTenantModule.resolveTenantEntry);

      window.history.replaceState({}, '', '/');
      render(<App />);

      expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
      expect(screen.getByText('통합 운영 웹 콘솔')).toBeInTheDocument();
      expect(screen.queryByText('회사 전용 로그인')).not.toBeInTheDocument();
      expect(screen.queryByText(/전용 콘솔$/)).not.toBeInTheDocument();
      expect(resolvePublicCompanyTenant).not.toHaveBeenCalled();
      expect(getWorkspaceBootstrap).not.toHaveBeenCalled();
    });
  });

  it('allows a system-admin session on a company tenant before entering the cockpit shell', async () => {
    setupCompanyCockpit({ sessionValue: systemAdminSession });

    render(<App />);

    await waitFor(() => {
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });
    expect(screen.queryByRole('heading', { name: '도메인 접근 권한 필요' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '천하운수 운영 대시보드' })).not.toBeInTheDocument();
    expect(screen.queryByText('전용 업무 cockpit')).not.toBeInTheDocument();
    expect(await screen.findByText('천하운수')).toBeInTheDocument();
  });

  it('renders the company cockpit for the canonical transport_ops workflow profile', async () => {
    setupCompanyCockpit({
      bootstrap: {
        ...cockpitBootstrap,
        workflowProfile: 'transport_ops',
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(getWorkspaceBootstrap).toHaveBeenCalledWith(expect.anything(), 'cheonha');
    });

    expect(screen.queryByText('이 tenant에 연결된 cockpit profile을 아직 렌더링할 수 없습니다.')).not.toBeInTheDocument();
    expect(await screen.findByText('CLEVER')).toBeInTheDocument();
    expect(await screen.findByText('천하운수')).toBeInTheDocument();
  });

  it('rejects a company manager session on the wrong company subdomain before entering the cockpit shell', async () => {
    vi.mocked(loadStoredSession).mockReturnValue(wrongCompanySession);
    vi.mocked(resolveTenantEntry).mockReturnValue({
      type: 'company',
      tenantCode: 'other-company',
      host: 'other-company.ev-dashboard.com',
      source: 'host',
      basePath: '',
    });
    vi.mocked(resolvePublicCompanyTenant).mockResolvedValue(cockpitBootstrap);
    vi.mocked(getWorkspaceBootstrap).mockResolvedValue(cockpitBootstrap);

    render(<App />);

    await waitFor(() => expect(getWorkspaceBootstrap).not.toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: '도메인 접근 권한 필요' })).toBeInTheDocument();
    expect(screen.getByText('회사 계정은 자기 회사 경로에서만 사용할 수 있습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '천하운수 운영 대시보드' })).not.toBeInTheDocument();
    expect(screen.queryByText('전용 업무 cockpit')).not.toBeInTheDocument();
  });
});
