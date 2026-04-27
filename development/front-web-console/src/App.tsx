import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type Dispatch, type MutableRefObject, type ReactNode, type SetStateAction } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { login, logout, signupRequestIntake } from './api/auth';
import { resolvePublicCompanyTenant } from './api/companyTenant';
import {
  ApiError,
  createHttpClient,
  DEFAULT_API_BASE_URL,
  GENERIC_SERVER_ERROR_MESSAGE,
  getErrorMessage,
  type HttpClient,
  type SessionPayload,
} from './api/http';
import { listPublicCompanies } from './api/organization';
import { getWorkspaceBootstrap } from './api/workspaceBootstrap';
import { Layout } from './components/Layout';
import {
  DISPLAY_DURATION_MS,
  TopNotificationBar,
  type TopNotification,
  type TopNotificationTone,
} from './components/TopNotificationBar';
import {
  resolveTopNotificationTemplate,
  type TopNotificationTemplateKey,
} from './components/topNotificationTemplates';
import { CockpitShell } from './cockpit/CockpitShell';
import { CheonhaDashboardPage } from './cockpit/cheonha/CheonhaDashboardPage';
import { CheonhaSettlementWorkspace } from './cockpit/cheonha/CheonhaSettlementWorkspace';
import { RequireAdmin } from './components/RequireAdmin';
import { RequireRoleScope } from './components/RequireRoleScope';
import { SettlementSectionLayout } from './components/SettlementSectionLayout';
import { SettlementFlowProvider } from './components/SettlementFlowContext';
import {
  canAccessCompanyScope,
  canAccessDispatchScope,
  canAccessPersonnelDocumentScope,
  canAccessRegionScope,
  canAccessSettlementScope,
  canAccessVehicleScope,
  canManageAnnouncementScope,
  canManageCompanyNavigationPolicy,
  canManageManagerRoles,
  canManageCompanySuperAdmin,
  canManageDriverProfileScope,
  canManagePersonnelDocumentScope,
  canManageRegionScope,
} from './authScopes';
import { AccountPage } from './pages/AccountPage';
import { AccountsPage } from './pages/AccountsPage';
import { AnnouncementDetailPage } from './pages/AnnouncementDetailPage';
import { AnnouncementFormPage } from './pages/AnnouncementFormPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { CompanyFormPage } from './pages/CompanyFormPage';
import { CompanyNavigationPolicyPage } from './pages/CompanyNavigationPolicyPage';
import { DispatchBoardDetailPage } from './pages/DispatchBoardDetailPage';
import { DispatchBoardsPage } from './pages/DispatchBoardsPage';
import { DispatchPlanFormPage } from './pages/DispatchPlanFormPage';
import { DispatchUploadsPage } from './pages/DispatchUploadsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DriverDetailPage } from './pages/DriverDetailPage';
import { DriverFormPage } from './pages/DriverFormPage';
import { DriversPage } from './pages/DriversPage';
import { FleetDetailPage } from './pages/FleetDetailPage';
import { FleetFormPage } from './pages/FleetFormPage';
import { LoginPage } from './pages/LoginPage';
import { ManagerNavigationPolicyPage } from './pages/ManagerNavigationPolicyPage';
import { ManagerRolesPage } from './pages/ManagerRolesPage';
import { ConsentRecoveryPage } from './pages/ConsentRecoveryPage';
import { PersonnelDocumentDetailPage } from './pages/PersonnelDocumentDetailPage';
import { PersonnelDocumentFormPage } from './pages/PersonnelDocumentFormPage';
import { PersonnelDocumentsPage } from './pages/PersonnelDocumentsPage';
import { RegionDetailPage } from './pages/RegionDetailPage';
import { RegionFormPage } from './pages/RegionFormPage';
import { RegionsPage } from './pages/RegionsPage';
import { SettlementCriteriaPage } from './pages/SettlementCriteriaPage';
import { SettlementInputsPage } from './pages/SettlementInputsPage';
import { SettlementOverviewPage } from './pages/SettlementOverviewPage';
import { SettlementResultsPage } from './pages/SettlementResultsPage';
import { SettlementRunsPage } from './pages/SettlementRunsPage';
import { SupportPage } from './pages/SupportPage';
import { TopNotificationPreviewPage } from './pages/TopNotificationPreviewPage';
import { VehicleAssignmentDetailPage } from './pages/VehicleAssignmentDetailPage';
import { VehicleAssignmentFormPage } from './pages/VehicleAssignmentFormPage';
import { VehicleAssignmentsPage } from './pages/VehicleAssignmentsPage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { VehicleFormPage } from './pages/VehicleFormPage';
import { VehicleOperatorAccessFormPage } from './pages/VehicleOperatorAccessFormPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { clearStoredSession, loadStoredSession, persistSession } from './sessionPersistence';
import { resolveTenantEntry } from './tenant/resolveTenantEntry';
import type { TenantCompanyContext, WorkspaceBootstrapPayload } from './types';
import { useNavigationPolicyWithRefresh } from './hooks/useNavigationPolicy';
import { accountItem, dashboardItem, isNavigationItemActive, navigationGroups } from './navigation';
import type { NavItemKey } from './authScopes';
import { CheonhaVehicleHomePage } from './cockpit/cheonha/CheonhaVehicleHomePage';

const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_startTransition: true,
} as const;

const TENANT_NOT_FOUND_MESSAGE = '존재하지 않는 회사 경로입니다.';
const TENANT_RESOLVE_ERROR_MESSAGE = '회사 문맥을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.';
const COMPANY_COCKPIT_WORKFLOW_PROFILES = new Set(['transport_ops', 'cheonha_ops_v1']);

function isCompanyCockpitWorkflowProfile(profile: string | null | undefined) {
  return profile !== undefined && profile !== null && COMPANY_COCKPIT_WORKFLOW_PROFILES.has(profile);
}

function resolveFirstAllowedPath(session: SessionPayload, allowedNavKeys: NavItemKey[]) {
  const allowed = new Set(allowedNavKeys);
  if (allowed.has(dashboardItem.key)) {
    return dashboardItem.to;
  }

  for (const group of navigationGroups) {
    if (!group.isVisible(session)) {
      continue;
    }
    for (const item of group.items) {
      if (item.isVisible(session) && allowed.has(item.key)) {
        return item.to;
      }
    }
  }

  return accountItem.to;
}

function resolveActiveNavKey(session: SessionPayload, pathname: string): NavItemKey | null {
  if (isNavigationItemActive(pathname, dashboardItem)) {
    return dashboardItem.key;
  }
  if (isNavigationItemActive(pathname, accountItem)) {
    return accountItem.key;
  }

  for (const group of navigationGroups) {
    if (!group.isVisible(session)) {
      continue;
    }
    for (const item of group.items) {
      if (item.isVisible(session) && isNavigationItemActive(pathname, item)) {
        return item.key;
      }
    }
  }

  return null;
}

type NavigationPolicyRouteEffectProps = {
  session: SessionPayload;
  allowedNavKeys: NavItemKey[];
  isLoading: boolean;
  onRedirect: () => void;
};

function NavigationPolicyRouteEffect({
  session,
  allowedNavKeys,
  isLoading,
  onRedirect,
}: NavigationPolicyRouteEffectProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const activeKey = resolveActiveNavKey(session, location.pathname);
    if (activeKey === null) {
      return;
    }

    if (allowedNavKeys.includes(activeKey)) {
      return;
    }

    const nextPath = resolveFirstAllowedPath(session, allowedNavKeys);
    if (location.pathname === nextPath) {
      return;
    }

    onRedirect();
    navigate(nextPath, { replace: true });
  }, [allowedNavKeys, isLoading, location.pathname, navigate, onRedirect, session]);

  return null;
}

function PostLoginRouteEffect({ redirectTick }: { redirectTick: number }) {
  const navigate = useNavigate();
  const handledRedirectTickRef = useRef(0);

  useEffect(() => {
    if (redirectTick === 0) {
      return;
    }

    if (handledRedirectTickRef.current === redirectTick) {
      return;
    }

    handledRedirectTickRef.current = redirectTick;
    navigate('/', { replace: true });
  }, [navigate, redirectTick]);

  return null;
}

function isLocalDebugRouteEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function DevSessionRoute() {
  const [DevSessionPage, setDevSessionPage] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import('./pages/DevSessionPage').then(({ DevSessionPage: LoadedDevSessionPage }) => {
      if (!cancelled) {
        setDevSessionPage(() => LoadedDevSessionPage);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (DevSessionPage === null) {
    return null;
  }

  return <DevSessionPage />;
}

function getDomainAccessState({
  isCompanyTenant,
  session,
  tenantCompany,
  tenantResolutionStatus,
}: {
  isCompanyTenant: boolean;
  session: SessionPayload | null;
  tenantCompany: TenantCompanyContext | null;
  tenantResolutionStatus: 'loading' | 'resolved' | 'not_found' | 'error';
}) {
  const isSystemAdminSession = session?.activeAccount?.accountType === 'system_admin';
  const isManagerSession = session?.activeAccount?.accountType === 'manager';
  const isMatchingCompanySession =
    isCompanyTenant &&
    tenantResolutionStatus === 'resolved' &&
    isManagerSession &&
    tenantCompany !== null &&
    session?.activeAccount?.companyId === tenantCompany.companyId;
  const canAccessCompanyTenant =
    isCompanyTenant &&
    tenantResolutionStatus === 'resolved' &&
    (isMatchingCompanySession || isSystemAdminSession);

  return {
    hasSession: session !== null,
    isBlocked:
      session !== null &&
      ((isCompanyTenant && tenantResolutionStatus === 'resolved' && !canAccessCompanyTenant) ||
        (!isCompanyTenant && !isSystemAdminSession)),
    canAccessCompanyTenant,
    isMatchingCompanySession,
  };
}

function DomainAccessBlockedPanel({
  description,
  title,
  onLogout,
}: {
  description: string;
  title: string;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <div className="auth-shell admin-auth-shell">
      <section className="auth-panel panel blocked-panel">
        <p className="panel-kicker">접근 제어</p>
        <h2>{title}</h2>
        <p className="hero-copy">{description}</p>
        <button className="button primary" onClick={() => void onLogout()} type="button">
          로그인 화면으로
        </button>
      </section>
    </div>
  );
}

function MainDomainShell({
  client,
  handleLogout,
  handleNavigationRedirect,
  postLoginRedirectTick,
  policyRedirectTick,
  isLocalDebugRouteVisible,
  session,
  sessionRef,
  setSession,
  showTopNotification,
  topNotificationNode,
}: {
  client: HttpClient;
  handleLogout: () => Promise<void>;
  handleNavigationRedirect: () => void;
  postLoginRedirectTick: number;
  policyRedirectTick: number;
  isLocalDebugRouteVisible: boolean;
  session: SessionPayload;
  sessionRef: MutableRefObject<SessionPayload | null>;
  setSession: Dispatch<SetStateAction<SessionPayload | null>>;
  showTopNotification: (message: string, tone: TopNotificationTone, options?: { dedupeKey?: string }) => void;
  topNotificationNode: ReactNode;
}) {
  const { allowedNavKeys, isLoading: isNavigationPolicyLoading } = useNavigationPolicyWithRefresh(
    client,
    session,
    policyRedirectTick,
  );

  return (
    <>
      {topNotificationNode}
      <PostLoginRouteEffect redirectTick={postLoginRedirectTick} />
      <NavigationPolicyRouteEffect
        allowedNavKeys={allowedNavKeys}
        isLoading={isNavigationPolicyLoading}
        onRedirect={handleNavigationRedirect}
        session={session}
      />
      <RequireAdmin session={session} onLogout={handleLogout}>
        <Routes>
          <Route element={<Layout session={session} onLogout={handleLogout} allowedNavKeys={allowedNavKeys} />}>
            <Route path="/" element={<DashboardPage client={client} session={session} />} />
            <Route
              path="/me"
              element={
                <AccountPage
                  client={client}
                  onSessionChange={(nextSession) => {
                    sessionRef.current = nextSession;
                    setSession(nextSession);
                  }}
                  session={session}
                />
              }
            />
            <Route path="/account" element={<Navigate replace to="/me" />} />
            <Route path="/admin/account-requests" element={<AccountsPage client={client} session={session} />} />
            <Route path="/accounts" element={<Navigate replace to="/admin/account-requests" />} />
            <Route
              path="/admin/menu-policy"
              element={
                <RequireRoleScope
                  message="메뉴 정책은 시스템 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="메뉴 정책 권한 필요"
                  when={canManageCompanySuperAdmin}
                >
                  <ManagerNavigationPolicyPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route path="/admin/navigation-policy" element={<Navigate replace to="/admin/menu-policy" />} />
            <Route
              path="/admin/manager-roles"
              element={
                <RequireRoleScope
                  message="관리자 역할은 시스템 관리자와 회사 전체 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="관리자 역할 권한 필요"
                  when={canManageManagerRoles}
                >
                  <ManagerRolesPage client={client} onShowNotice={showTopNotification} session={session} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/company/menu-policy"
              element={
                <RequireRoleScope
                  message="회사 메뉴 정책은 회사 전체 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="회사 메뉴 정책 권한 필요"
                  when={canManageCompanyNavigationPolicy}
                >
                  <CompanyNavigationPolicyPage client={client} session={session} />
                </RequireRoleScope>
              }
            />
            <Route path="/company/navigation-policy" element={<Navigate replace to="/company/menu-policy" />} />
            <Route path="/organization" element={<Navigate replace to="/companies" />} />
            <Route path="/dispatch" element={<Navigate replace to="/dispatch/boards" />} />
            <Route
              path="/dispatch/uploads"
              element={
                <RequireRoleScope
                  message="배차는 시스템 관리자, 회사 전체 관리자, 플릿 관리자, 정산 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="배차 관리 권한 필요"
                  when={canAccessDispatchScope}
                >
                  <DispatchUploadsPage client={client} session={session} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/dispatch/boards"
              element={
                <RequireRoleScope
                  message="배차는 시스템 관리자, 회사 전체 관리자, 플릿 관리자, 정산 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="배차 관리 권한 필요"
                  when={canAccessDispatchScope}
                >
                  <DispatchBoardsPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/dispatch/boards/:fleetRef/:dispatchDate"
              element={
                <RequireRoleScope
                  message="배차는 시스템 관리자, 회사 전체 관리자, 플릿 관리자, 정산 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="배차 관리 권한 필요"
                  when={canAccessDispatchScope}
                >
                  <DispatchBoardDetailPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/dispatch/plans/new"
              element={
                <RequireRoleScope
                  message="배차는 시스템 관리자, 회사 전체 관리자, 플릿 관리자, 정산 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="배차 관리 권한 필요"
                  when={canAccessDispatchScope}
                >
                  <DispatchPlanFormPage client={client} mode="create" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/dispatch/plans/:dispatchPlanRef/edit"
              element={
                <RequireRoleScope
                  message="배차는 시스템 관리자, 회사 전체 관리자, 플릿 관리자, 정산 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="배차 관리 권한 필요"
                  when={canAccessDispatchScope}
                >
                  <DispatchPlanFormPage client={client} mode="edit" />
                </RequireRoleScope>
              }
            />
            <Route path="/announcements" element={<AnnouncementsPage client={client} session={session} />} />
            <Route
              path="/announcements/new"
              element={
                <RequireRoleScope
                  message="공지 생성과 수정은 시스템 관리자 또는 회사 전체 관리자만 할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="공지 관리 권한 필요"
                  when={canManageAnnouncementScope}
                >
                  <AnnouncementFormPage client={client} mode="create" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/announcements/:announcementSlug"
              element={<AnnouncementDetailPage client={client} session={session} />}
            />
            <Route
              path="/announcements/:announcementSlug/edit"
              element={
                <RequireRoleScope
                  message="공지 생성과 수정은 시스템 관리자 또는 회사 전체 관리자만 할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="공지 관리 권한 필요"
                  when={canManageAnnouncementScope}
                >
                  <AnnouncementFormPage client={client} mode="edit" />
                </RequireRoleScope>
              }
            />
            <Route path="/support" element={<SupportPage client={client} session={session} />} />
            <Route
              path="/block"
              element={
                isLocalDebugRouteVisible ? (
                  <TopNotificationPreviewPage onShowNotice={showTopNotification} />
                ) : (
                  <Navigate replace to="/" />
                )
              }
            />
            <Route
              path="/regions"
              element={
                <RequireRoleScope
                  message="권역은 시스템 관리자와 회사 관리자 레벨에서 조회할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="권역 조회 권한 필요"
                  when={canAccessRegionScope}
                >
                  <RegionsPage client={client} session={session} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/regions/new"
              element={
                <RequireRoleScope
                  message="권역 정본 생성과 수정은 시스템 관리자 또는 회사 전체 관리자만 할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="권역 관리 권한 필요"
                  when={canManageRegionScope}
                >
                  <RegionFormPage client={client} mode="create" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/regions/:regionRef"
              element={
                <RequireRoleScope
                  message="권역은 시스템 관리자와 회사 관리자 레벨에서 조회할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="권역 조회 권한 필요"
                  when={canAccessRegionScope}
                >
                  <RegionDetailPage client={client} session={session} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/regions/:regionRef/edit"
              element={
                <RequireRoleScope
                  message="권역 정본 생성과 수정은 시스템 관리자 또는 회사 전체 관리자만 할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="권역 관리 권한 필요"
                  when={canManageRegionScope}
                >
                  <RegionFormPage client={client} mode="edit" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/companies"
              element={
                <RequireRoleScope
                  message="회사 정본은 시스템 관리자 또는 회사 전체 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="회사 관리 권한 필요"
                  when={canAccessCompanyScope}
                >
                  <CompaniesPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/companies/new"
              element={
                <RequireRoleScope
                  message="회사 정본은 시스템 관리자 또는 회사 전체 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="회사 관리 권한 필요"
                  when={canAccessCompanyScope}
                >
                  <CompanyFormPage client={client} mode="create" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/companies/:companyRef"
              element={
                <RequireRoleScope
                  message="회사 정본은 시스템 관리자 또는 회사 전체 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="회사 관리 권한 필요"
                  when={canAccessCompanyScope}
                >
                  <CompanyDetailPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/companies/:companyRef/edit"
              element={
                <RequireRoleScope
                  message="회사 정본은 시스템 관리자 또는 회사 전체 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="회사 관리 권한 필요"
                  when={canAccessCompanyScope}
                >
                  <CompanyFormPage client={client} mode="edit" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/companies/:companyRef/fleets/new"
              element={
                <RequireRoleScope
                  message="회사 정본은 시스템 관리자 또는 회사 전체 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="회사 관리 권한 필요"
                  when={canAccessCompanyScope}
                >
                  <FleetFormPage client={client} mode="create" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/companies/:companyRef/fleets/:fleetRef"
              element={
                <RequireRoleScope
                  message="회사 정본은 시스템 관리자 또는 회사 전체 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="회사 관리 권한 필요"
                  when={canAccessCompanyScope}
                >
                  <FleetDetailPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/companies/:companyRef/fleets/:fleetRef/edit"
              element={
                <RequireRoleScope
                  message="회사 정본은 시스템 관리자 또는 회사 전체 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="회사 관리 권한 필요"
                  when={canAccessCompanyScope}
                >
                  <FleetFormPage client={client} mode="edit" />
                </RequireRoleScope>
              }
            />
            <Route path="/drivers" element={<DriversPage client={client} session={session} />} />
            <Route
              path="/drivers/new"
              element={
                <RequireRoleScope
                  message="배송원 정본 생성과 수정은 시스템 관리자, 회사 전체 관리자, 정산 관리자, 플릿 관리자만 할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="배송원 관리 권한 필요"
                  when={canManageDriverProfileScope}
                >
                  <DriverFormPage client={client} mode="create" />
                </RequireRoleScope>
              }
            />
            <Route path="/drivers/:driverRef" element={<DriverDetailPage client={client} session={session} />} />
            <Route
              path="/drivers/:driverRef/edit"
              element={
                <RequireRoleScope
                  message="배송원 정본 생성과 수정은 시스템 관리자, 회사 전체 관리자, 정산 관리자, 플릿 관리자만 할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="배송원 관리 권한 필요"
                  when={canManageDriverProfileScope}
                >
                  <DriverFormPage client={client} mode="edit" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/personnel-documents"
              element={
                <RequireRoleScope
                  message="인사문서는 관리자 계정에서만 접근할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="인사문서 접근 권한 필요"
                  when={canAccessPersonnelDocumentScope}
                >
                  <PersonnelDocumentsPage client={client} session={session} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/personnel-documents/new"
              element={
                <RequireRoleScope
                  message="인사문서 생성과 수정은 시스템 관리자, 회사 전체 관리자, 정산 관리자, 플릿 관리자만 할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="인사문서 관리 권한 필요"
                  when={canManagePersonnelDocumentScope}
                >
                  <PersonnelDocumentFormPage client={client} mode="create" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/personnel-documents/:documentRef"
              element={
                <RequireRoleScope
                  message="인사문서는 관리자 계정에서만 접근할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="인사문서 접근 권한 필요"
                  when={canAccessPersonnelDocumentScope}
                >
                  <PersonnelDocumentDetailPage client={client} session={session} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/personnel-documents/:documentRef/edit"
              element={
                <RequireRoleScope
                  message="인사문서 생성과 수정은 시스템 관리자, 회사 전체 관리자, 정산 관리자, 플릿 관리자만 할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="인사문서 관리 권한 필요"
                  when={canManagePersonnelDocumentScope}
                >
                  <PersonnelDocumentFormPage client={client} mode="edit" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/vehicles"
              element={
                <RequireRoleScope
                  message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="차량 관리 권한 필요"
                  when={canAccessVehicleScope}
                >
                  <VehiclesPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/vehicles/new"
              element={
                <RequireRoleScope
                  message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="차량 관리 권한 필요"
                  when={canAccessVehicleScope}
                >
                  <VehicleFormPage client={client} mode="create" />
                </RequireRoleScope>
              }
            />
            <Route path="/vehicles/home" element={<Navigate replace to="/vehicles" />} />
            <Route
              path="/vehicles/:vehicleRef"
              element={
                <RequireRoleScope
                  message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="차량 관리 권한 필요"
                  when={canAccessVehicleScope}
                >
                  <VehicleDetailPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/vehicles/:vehicleRef/edit"
              element={
                <RequireRoleScope
                  message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="차량 관리 권한 필요"
                  when={canAccessVehicleScope}
                >
                  <VehicleFormPage client={client} mode="edit" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/vehicles/:vehicleRef/accesses/new"
              element={
                <RequireRoleScope
                  message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="차량 관리 권한 필요"
                  when={canAccessVehicleScope}
                >
                  <VehicleOperatorAccessFormPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/vehicle-assignments"
              element={
                <RequireRoleScope
                  message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="차량 관리 권한 필요"
                  when={canAccessVehicleScope}
                >
                  <VehicleAssignmentsPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/vehicle-assignments/new"
              element={
                <RequireRoleScope
                  message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="차량 관리 권한 필요"
                  when={canAccessVehicleScope}
                >
                  <VehicleAssignmentFormPage client={client} mode="create" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/vehicle-assignments/:assignmentRef"
              element={
                <RequireRoleScope
                  message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="차량 관리 권한 필요"
                  when={canAccessVehicleScope}
                >
                  <VehicleAssignmentDetailPage client={client} />
                </RequireRoleScope>
              }
            />
            <Route
              path="/vehicle-assignments/:assignmentRef/edit"
              element={
                <RequireRoleScope
                  message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="차량 관리 권한 필요"
                  when={canAccessVehicleScope}
                >
                  <VehicleAssignmentFormPage client={client} mode="edit" />
                </RequireRoleScope>
              }
            />
            <Route
              path="/settlements/overview"
              element={
                <RequireRoleScope
                  message="정산은 시스템 관리자, 회사 전체 관리자, 정산 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="정산 관리 권한 필요"
                  when={canAccessSettlementScope}
                >
                  <SettlementFlowProvider client={client} session={session}>
                    <SettlementOverviewPage client={client} />
                  </SettlementFlowProvider>
                </RequireRoleScope>
              }
            />
            <Route
              path="/settlements"
              element={
                <RequireRoleScope
                  message="정산은 시스템 관리자, 회사 전체 관리자, 정산 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="정산 관리 권한 필요"
                  when={canAccessSettlementScope}
                >
                  <SettlementSectionLayout client={client} session={session} />
                </RequireRoleScope>
              }
            >
              <Route index element={<Navigate replace to="/settlements/overview" />} />
              <Route path="criteria" element={<SettlementCriteriaPage client={client} session={session} />} />
              <Route path="inputs" element={<SettlementInputsPage client={client} />} />
              <Route path="runs" element={<SettlementRunsPage client={client} />} />
              <Route path="results" element={<SettlementResultsPage client={client} />} />
            </Route>
            <Route path="*" element={<Navigate replace to="/" />} />
          </Route>
        </Routes>
      </RequireAdmin>
    </>
  );
}

function CompanyCockpitShell({
  client,
  companyName,
  handleLogout,
  handleNavigationRedirect,
  policyRedirectTick,
  session,
  sessionRef,
  setSession,
  topNotificationNode,
}: {
  client: HttpClient;
  companyName: string;
  handleLogout: () => Promise<void>;
  handleNavigationRedirect: () => void;
  policyRedirectTick: number;
  session: SessionPayload;
  sessionRef: MutableRefObject<SessionPayload | null>;
  setSession: Dispatch<SetStateAction<SessionPayload | null>>;
  topNotificationNode: ReactNode;
}) {
  const { allowedNavKeys, isLoading: isNavigationPolicyLoading } = useNavigationPolicyWithRefresh(
    client,
    session,
    policyRedirectTick,
  );

  return (
    <>
      {topNotificationNode}
      <NavigationPolicyRouteEffect
        allowedNavKeys={allowedNavKeys}
        isLoading={isNavigationPolicyLoading}
        onRedirect={handleNavigationRedirect}
        session={session}
      />
      <Routes>
        <Route element={<CockpitShell companyName={companyName} onLogout={handleLogout} session={session} />}>
          <Route path="/" element={<CheonhaDashboardPage companyName={companyName} />} />
          <Route path="/vehicles/home" element={<CheonhaVehicleHomePage />} />
          <Route path="/drivers" element={<DriversPage client={client} session={session} viewMode="vehicleStatus" />} />
          <Route
            path="/drivers/new"
            element={
              <RequireRoleScope
                message="배송원 정본 생성과 수정은 시스템 관리자, 회사 전체 관리자, 정산 관리자, 플릿 관리자만 할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="배송원 관리 권한 필요"
                when={canManageDriverProfileScope}
              >
                <DriverFormPage client={client} mode="create" />
              </RequireRoleScope>
            }
          />
          <Route path="/drivers/:driverRef" element={<DriverDetailPage client={client} session={session} />} />
          <Route
            path="/drivers/:driverRef/edit"
            element={
              <RequireRoleScope
                message="배송원 정본 생성과 수정은 시스템 관리자, 회사 전체 관리자, 정산 관리자, 플릿 관리자만 할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="배송원 관리 권한 필요"
                when={canManageDriverProfileScope}
              >
                <DriverFormPage client={client} mode="edit" />
              </RequireRoleScope>
            }
          />
          <Route
            path="/vehicles"
            element={
              <RequireRoleScope
                message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="차량 관리 권한 필요"
                when={canAccessVehicleScope}
              >
                <VehiclesPage client={client} />
              </RequireRoleScope>
            }
          />
          <Route
            path="/vehicles/new"
            element={
              <RequireRoleScope
                message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="차량 관리 권한 필요"
                when={canAccessVehicleScope}
              >
                <VehicleFormPage client={client} mode="create" />
              </RequireRoleScope>
            }
          />
          <Route
            path="/vehicles/:vehicleRef"
            element={
              <RequireRoleScope
                message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="차량 관리 권한 필요"
                when={canAccessVehicleScope}
              >
                <VehicleDetailPage client={client} />
              </RequireRoleScope>
            }
          />
          <Route
            path="/vehicles/:vehicleRef/edit"
            element={
              <RequireRoleScope
                message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="차량 관리 권한 필요"
                when={canAccessVehicleScope}
              >
                <VehicleFormPage client={client} mode="edit" />
              </RequireRoleScope>
            }
          />
          <Route
            path="/vehicles/:vehicleRef/accesses/new"
            element={
              <RequireRoleScope
                message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="차량 관리 권한 필요"
                when={canAccessVehicleScope}
              >
                <VehicleOperatorAccessFormPage client={client} />
              </RequireRoleScope>
            }
          />
          <Route
            path="/vehicle-assignments"
            element={
              <RequireRoleScope
                message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="차량 관리 권한 필요"
                when={canAccessVehicleScope}
              >
                <VehicleAssignmentsPage client={client} />
              </RequireRoleScope>
            }
          />
          <Route
            path="/vehicle-assignments/new"
            element={
              <RequireRoleScope
                message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="차량 관리 권한 필요"
                when={canAccessVehicleScope}
              >
                <VehicleAssignmentFormPage client={client} mode="create" />
              </RequireRoleScope>
            }
          />
          <Route
            path="/vehicle-assignments/:assignmentRef"
            element={
              <RequireRoleScope
                message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="차량 관리 권한 필요"
                when={canAccessVehicleScope}
              >
                <VehicleAssignmentDetailPage client={client} />
              </RequireRoleScope>
            }
          />
          <Route
            path="/vehicle-assignments/:assignmentRef/edit"
            element={
              <RequireRoleScope
                message="차량과 차량 배정은 시스템 관리자, 회사 전체 관리자, 차량 관리자만 관리할 수 있습니다."
                onLogout={handleLogout}
                session={session}
                title="차량 관리 권한 필요"
                when={canAccessVehicleScope}
              >
                <VehicleAssignmentFormPage client={client} mode="edit" />
              </RequireRoleScope>
            }
          />
          <Route
            path="/me"
            element={
              <AccountPage
                client={client}
                onSessionChange={(nextSession) => {
                  sessionRef.current = nextSession;
                  setSession(nextSession);
                }}
                session={session}
              />
            }
          />
          <Route
            path="/settlement/*"
            element={<CheonhaSettlementWorkspace client={client} companyName={companyName} session={session} />}
          />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Route>
      </Routes>
    </>
  );
}

function AppContent() {
  const tenantEntry = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return resolveTenantEntry(window.location.hostname, window.location.pathname);
  }, []);
  const isCompanyTenant = tenantEntry?.type === 'company';
  const [session, setSession] = useState<SessionPayload | null>(() => loadStoredSession());
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [companyErrorMessage, setCompanyErrorMessage] = useState<string | null>(null);
  const [topNotification, setTopNotification] = useState<TopNotification | null>(null);
  const [policyRedirectTick, setPolicyRedirectTick] = useState(0);
  const [postLoginRedirectTick, setPostLoginRedirectTick] = useState(0);
  const [publicCompanies, setPublicCompanies] = useState<{ company_id: string; route_no?: number; name: string }[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantCompany, setTenantCompany] = useState<TenantCompanyContext | null>(null);
  const [workspaceBootstrap, setWorkspaceBootstrap] = useState<WorkspaceBootstrapPayload | null>(null);
  const [workspaceBootstrapError, setWorkspaceBootstrapError] = useState<string | null>(null);
  const [isLoadingWorkspaceBootstrap, setIsLoadingWorkspaceBootstrap] = useState(false);
  const [tenantResolutionStatus, setTenantResolutionStatus] = useState<'loading' | 'resolved' | 'not_found' | 'error'>(
    () => (isCompanyTenant ? 'loading' : 'resolved'),
  );
  const sessionRef = useRef<SessionPayload | null>(session);
  const clientRef = useRef<HttpClient | null>(null);
  const notificationIdRef = useRef(0);
  const promotedServerErrorElementsRef = useRef(new WeakSet<HTMLElement>());
  const isLocalDebugRouteVisible = isLocalDebugRouteEnabled();

  const showTopNotification = useCallback((
    message: string,
    tone: TopNotificationTone,
    options?: { dedupeKey?: string },
  ) => {
    const nextExpiresAt = Date.now() + DISPLAY_DURATION_MS;
    const dedupeKey = options?.dedupeKey ?? `message:${tone}:${message}`;
    setTopNotification((current) => {
      if (current && current.dedupeKey === dedupeKey) {
        return {
          ...current,
          message,
          tone,
          expiresAt: nextExpiresAt,
        };
      }

      notificationIdRef.current += 1;
      return {
        id: notificationIdRef.current,
        dedupeKey,
        message,
        tone,
        expiresAt: nextExpiresAt,
      };
    });
  }, []);

  const showTopNotificationTemplate = useCallback((templateKey: TopNotificationTemplateKey) => {
    const template = resolveTopNotificationTemplate(templateKey);
    showTopNotification(template.message, template.tone, { dedupeKey: template.dedupeKey });
  }, [showTopNotification]);

  const handleNavigationRedirect = useCallback(() => {
    showTopNotificationTemplate('navigation-redirected');
  }, [showTopNotificationTemplate]);

  useEffect(() => {
    sessionRef.current = session;
    if (session) {
      persistSession(session);
      return;
    }

    clearStoredSession();
  }, [session]);

  useEffect(() => {
    function maybePromoteServerErrorBanner() {
      const serverErrorBanners = Array.from(
        document.querySelectorAll<HTMLElement>('.error-banner, .form-error'),
      ).filter((element) => element.textContent?.trim() === GENERIC_SERVER_ERROR_MESSAGE);

      let shouldPromoteTemplate = false;
      for (const element of serverErrorBanners) {
        element.classList.add('is-suppressed-by-top-notice');
        if (!promotedServerErrorElementsRef.current.has(element)) {
          promotedServerErrorElementsRef.current.add(element);
          shouldPromoteTemplate = true;
        }
      }

      if (!shouldPromoteTemplate) {
        return;
      }

      showTopNotificationTemplate('server-unavailable');
    }

    maybePromoteServerErrorBanner();
    const observer = new MutationObserver(() => {
      maybePromoteServerErrorBanner();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [showTopNotificationTemplate]);

  useEffect(() => {
    if (!isCompanyTenant) {
      if (session) {
        setCompanyErrorMessage(null);
        setTenantCompany(null);
        setTenantResolutionStatus('resolved');
        return;
      }

      let ignore = false;
      setTenantCompany(null);
      setTenantResolutionStatus('resolved');
      setIsLoadingCompanies(true);
      setCompanyErrorMessage(null);
      void listPublicCompanies()
        .then((companies) => {
          if (!ignore) {
            setPublicCompanies(companies);
          }
        })
        .catch((error) => {
          if (!ignore) {
            setCompanyErrorMessage(getErrorMessage(error, '회사 목록을 불러올 수 없습니다.'));
            setPublicCompanies([]);
          }
        })
        .finally(() => {
          if (!ignore) {
            setIsLoadingCompanies(false);
          }
        });

      return () => {
        ignore = true;
      };
    }

    let ignore = false;
    setTenantResolutionStatus('loading');
    setTenantCompany(null);
    setCompanyErrorMessage(null);
    setIsLoadingCompanies(true);
    void resolvePublicCompanyTenant(tenantEntry.tenantCode)
      .then((company) => {
        if (!ignore) {
          setTenantCompany(company);
          setPublicCompanies([
            {
              company_id: company.companyId,
              name: company.companyName,
            },
          ]);
          setTenantResolutionStatus('resolved');
        }
      })
      .catch((error) => {
        if (!ignore) {
          setTenantCompany(null);
          setPublicCompanies([]);
          if (error instanceof ApiError && error.status === 404) {
            setTenantResolutionStatus('not_found');
            setCompanyErrorMessage(null);
            return;
          }

          setTenantResolutionStatus('error');
          setCompanyErrorMessage(TENANT_RESOLVE_ERROR_MESSAGE);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingCompanies(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isCompanyTenant, session, tenantEntry]);

  useEffect(() => {
    if (session !== null || typeof window === 'undefined') {
      return;
    }

    const nextPath =
      tenantEntry?.type === 'company' && tenantEntry.source === 'path'
        ? `${tenantEntry.basePath}/login`
        : '/';

    if (window.location.pathname === nextPath && window.location.search === '' && window.location.hash === '') {
      return;
    }

    window.history.replaceState(window.history.state, '', nextPath);
  }, [session, tenantEntry]);

  if (clientRef.current === null) {
    clientRef.current = createHttpClient({
      baseUrl: DEFAULT_API_BASE_URL,
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      onSessionRefresh: (payload) => {
        sessionRef.current = payload;
        setSession(payload);
      },
      onUnauthorized: () => {
        sessionRef.current = null;
        setSession(null);
        setAuthError('세션이 만료되었습니다. 다시 로그인하세요.');
      },
      onNavigationForbidden: () => {
        showTopNotificationTemplate('navigation-policy-updated');
        setPolicyRedirectTick((current) => current + 1);
      },
    });
  }

  const client = clientRef.current as HttpClient;
  const domainAccessState = getDomainAccessState({
    isCompanyTenant,
    session,
    tenantCompany,
    tenantResolutionStatus,
  });

  useEffect(() => {
    if (!domainAccessState.canAccessCompanyTenant || tenantEntry?.type !== 'company') {
      setWorkspaceBootstrap(null);
      setWorkspaceBootstrapError(null);
      setIsLoadingWorkspaceBootstrap(false);
      return;
    }

    let ignore = false;
    setIsLoadingWorkspaceBootstrap(true);
    setWorkspaceBootstrapError(null);

    void getWorkspaceBootstrap(client, tenantEntry.tenantCode)
      .then((payload) => {
        if (!ignore) {
          setWorkspaceBootstrap(payload);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setWorkspaceBootstrap(null);
          setWorkspaceBootstrapError(getErrorMessage(error, '워크스페이스 정보를 불러올 수 없습니다.'));
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingWorkspaceBootstrap(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [client, domainAccessState.canAccessCompanyTenant, tenantEntry, tenantResolutionStatus]);

  async function handleLogin(credentials: { email: string; password: string }) {
    setIsSubmitting(true);
    setAuthError(null);
    setAuthStatusMessage(null);
    try {
      const nextSession = await login(credentials);
      sessionRef.current = nextSession;
      setSession(nextSession);
      setPostLoginRedirectTick((current) => current + 1);
      setTopNotification(null);
    } catch (error) {
      setAuthError(getErrorMessage(error, '로그인할 수 없습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignup(payload: {
    name: string;
    birthDate: string;
    email: string;
    password: string;
    companyId: string;
    requestTypes: string[];
    privacyPolicyConsented: boolean;
    locationPolicyConsented: boolean;
  }) {
    setIsSubmitting(true);
    setAuthError(null);
    setAuthStatusMessage(null);
    try {
      await signupRequestIntake({
        name: payload.name,
        birth_date: payload.birthDate,
        email: payload.email,
        password: payload.password,
        company_id: payload.companyId,
        request_types: payload.requestTypes,
        privacy_policy_version: 'v1.0',
        privacy_policy_consented: payload.privacyPolicyConsented,
        location_policy_version: 'v1.0',
        location_policy_consented: payload.locationPolicyConsented,
      });
      setAuthStatusMessage('회원가입 요청이 접수되었습니다. 같은 계정으로 로그인하면 진행 상태를 확인할 수 있습니다.');
    } catch (error) {
      setAuthError(getErrorMessage(error, '회원가입 요청을 제출할 수 없습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      sessionRef.current = null;
      setSession(null);
      setTopNotification(null);
    }
  }

  const topNotificationNode = topNotification ? (
    <TopNotificationBar
      key={topNotification.id}
      notice={topNotification}
      onDismiss={(notificationId) =>
        setTopNotification((current) => (current?.id === notificationId ? null : current))
      }
    />
  ) : null;

  if (isCompanyTenant && tenantResolutionStatus === 'not_found') {
    return (
      <div className="auth-shell admin-auth-shell">
        <section className="auth-panel panel blocked-panel">
          <p className="panel-kicker">Tenant Resolve</p>
          <h2>{TENANT_NOT_FOUND_MESSAGE}</h2>
          <p className="hero-copy">공개 tenant 확인에 실패했습니다. 회사 경로 또는 호스트를 다시 확인한 뒤 로그인하세요.</p>
        </section>
      </div>
    );
  }

  if (isCompanyTenant && tenantResolutionStatus === 'loading') {
    return (
      <div className="auth-shell admin-auth-shell">
        <section className="auth-panel panel blocked-panel">
          <p className="panel-kicker">Tenant Resolve</p>
          <h2>회사 문맥을 확인하는 중입니다.</h2>
          <p className="hero-copy">회사 경로 또는 호스트에 연결된 tenant를 조회하고 있습니다.</p>
        </section>
      </div>
    );
  }

  if (isCompanyTenant && tenantResolutionStatus === 'error') {
    return (
      <div className="auth-shell admin-auth-shell">
        <section className="auth-panel panel blocked-panel">
          <p className="panel-kicker">Tenant Resolve</p>
          <h2>회사 문맥 확인 실패</h2>
          <p className="hero-copy">{companyErrorMessage ?? TENANT_RESOLVE_ERROR_MESSAGE}</p>
        </section>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        {topNotificationNode}
        <LoginPage
          companies={publicCompanies}
          companyErrorMessage={companyErrorMessage}
          errorMessage={authError}
          isLoadingCompanies={isLoadingCompanies}
          isSubmitting={isSubmitting}
          onLogin={handleLogin}
          onSignup={handleSignup}
          presetCompany={
            tenantCompany
              ? {
                  company_id: tenantCompany.companyId,
                  name: tenantCompany.companyName,
                }
              : null
          }
          statusMessage={authStatusMessage}
        />
      </>
    );
  }

  if (session.sessionKind === 'consent_recovery') {
    return (
      <ConsentRecoveryPage
        client={client}
        onLogout={handleLogout}
        onRecovered={(nextSession) => {
          sessionRef.current = nextSession;
          setSession(nextSession);
        }}
      />
    );
  }

  if (session.activeAccount === null) {
    return (
      <div className="stack app-shell">
        <section className="panel blocked-panel">
          <p className="panel-kicker">승인 대기</p>
          <h2>웹 관리자 계정 승인 전입니다.</h2>
          <p className="hero-copy">내 계정 화면에서 현재 단계와 요청 내용을 확인하고, 필요하면 요청을 취소하거나 다시 생성할 수 있습니다.</p>
          <button className="button primary" onClick={() => void handleLogout()} type="button">
            로그아웃
          </button>
        </section>
        <AccountPage
          client={client}
          onSessionChange={(nextSession) => {
            sessionRef.current = nextSession;
            setSession(nextSession);
          }}
          session={session}
        />
      </div>
    );
  }

  if (session.activeAccount.accountType === 'driver') {
    return (
      <div className="auth-shell admin-auth-shell">
        <section className="auth-panel panel blocked-panel">
          <p className="panel-kicker">접근 제어</p>
          <h2>관리자 권한 필요</h2>
          <p className="hero-copy">이 콘솔은 웹 관리자 계정만 사용할 수 있습니다. 로그아웃 후 관리자 계정으로 다시 로그인하세요.</p>
          <button className="button primary" onClick={() => void handleLogout()} type="button">
            로그인 화면으로
          </button>
        </section>
      </div>
    );
  }

  if (domainAccessState.isBlocked) {
    return (
      <DomainAccessBlockedPanel
        description={
          isCompanyTenant
            ? '회사 계정은 자기 회사 경로에서만 사용할 수 있습니다.'
            : '메인 도메인은 시스템 관리자 계정만 사용할 수 있습니다.'
        }
        onLogout={handleLogout}
        title="도메인 접근 권한 필요"
      />
    );
  }

  if (isCompanyTenant) {
    const cockpitCompanyName = workspaceBootstrap?.companyName ?? tenantCompany?.companyName ?? tenantEntry.tenantCode;

    if (isLoadingWorkspaceBootstrap) {
      return (
        <div className="auth-shell admin-auth-shell">
          <section className="auth-panel panel blocked-panel">
            <p className="panel-kicker">Workspace Bootstrap</p>
            <h2>{cockpitCompanyName}</h2>
            <p className="hero-copy">회사 전용 cockpit 정보를 불러오는 중입니다.</p>
          </section>
        </div>
      );
    }

    if (workspaceBootstrapError) {
      return (
        <div className="auth-shell admin-auth-shell">
          <section className="auth-panel panel blocked-panel">
            <p className="panel-kicker">Workspace Bootstrap</p>
            <h2>{cockpitCompanyName}</h2>
            <p className="hero-copy">{workspaceBootstrapError}</p>
            <button className="button primary" onClick={() => void handleLogout()} type="button">
              로그아웃
            </button>
          </section>
        </div>
      );
    }

    if (isCompanyCockpitWorkflowProfile(workspaceBootstrap?.workflowProfile)) {
      return (
        <CompanyCockpitShell
          client={client}
          companyName={cockpitCompanyName}
          handleLogout={handleLogout}
          handleNavigationRedirect={handleNavigationRedirect}
          policyRedirectTick={policyRedirectTick}
          session={session}
          sessionRef={sessionRef}
          setSession={setSession}
          topNotificationNode={topNotificationNode}
        />
      );
    }

    return (
      <div className="auth-shell admin-auth-shell">
        <section className="auth-panel panel blocked-panel">
          <p className="panel-kicker">Workflow Profile</p>
          <h2>{cockpitCompanyName}</h2>
          <p className="hero-copy">이 tenant에 연결된 cockpit profile을 아직 렌더링할 수 없습니다.</p>
          <button className="button primary" onClick={() => void handleLogout()} type="button">
            로그아웃
          </button>
        </section>
      </div>
    );
  }
  return (
    <MainDomainShell
      client={client}
      handleLogout={handleLogout}
      handleNavigationRedirect={handleNavigationRedirect}
      isLocalDebugRouteVisible={isLocalDebugRouteVisible}
      postLoginRedirectTick={postLoginRedirectTick}
      policyRedirectTick={policyRedirectTick}
      session={session}
      sessionRef={sessionRef}
      setSession={setSession}
      showTopNotification={showTopNotification}
      topNotificationNode={topNotificationNode}
    />
  );
}

function AppRouteGate() {
  const location = useLocation();
  const isLocalSandbox = import.meta.env.MODE === 'local-sandbox';

  if (isLocalSandbox && location.pathname === '/__dev__/session') {
    return <DevSessionRoute />;
  }

  return <AppContent />;
}

export default function App() {
  const tenantEntry =
    typeof window === 'undefined'
      ? null
      : resolveTenantEntry(window.location.hostname, window.location.pathname);
  const basename =
    tenantEntry?.type === 'company' && tenantEntry.source === 'path' ? tenantEntry.basePath : undefined;

  return (
    <BrowserRouter basename={basename} future={ROUTER_FUTURE}>
      <AppRouteGate />
    </BrowserRouter>
  );
}
