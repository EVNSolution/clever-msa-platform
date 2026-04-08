import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { login, logout, signupRequestIntake } from './api/auth';
import { createHttpClient, DEFAULT_API_BASE_URL, getErrorMessage, type HttpClient, type SessionPayload } from './api/http';
import { listPublicCompanies } from './api/organization';
import { Layout } from './components/Layout';
import { RequireAdmin } from './components/RequireAdmin';
import { RequireRoleScope } from './components/RequireRoleScope';
import { SettlementSectionLayout } from './components/SettlementSectionLayout';
import {
  canAccessCompanyScope,
  canAccessDispatchScope,
  canAccessPersonnelDocumentScope,
  canAccessRegionScope,
  canAccessSettlementScope,
  canAccessVehicleScope,
  canManageAnnouncementScope,
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
import { DispatchBoardDetailPage } from './pages/DispatchBoardDetailPage';
import { DispatchBoardsPage } from './pages/DispatchBoardsPage';
import { DispatchPlanFormPage } from './pages/DispatchPlanFormPage';
import { DashboardPage } from './pages/DashboardPage';
import { DriverDetailPage } from './pages/DriverDetailPage';
import { DriverFormPage } from './pages/DriverFormPage';
import { DriversPage } from './pages/DriversPage';
import { FleetDetailPage } from './pages/FleetDetailPage';
import { FleetFormPage } from './pages/FleetFormPage';
import { LoginPage } from './pages/LoginPage';
import { ConsentRecoveryPage } from './pages/ConsentRecoveryPage';
import { NotificationsPage } from './pages/NotificationsPage';
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
import { VehicleAssignmentDetailPage } from './pages/VehicleAssignmentDetailPage';
import { VehicleAssignmentFormPage } from './pages/VehicleAssignmentFormPage';
import { VehicleAssignmentsPage } from './pages/VehicleAssignmentsPage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { VehicleFormPage } from './pages/VehicleFormPage';
import { VehicleOperatorAccessFormPage } from './pages/VehicleOperatorAccessFormPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { clearStoredSession, loadStoredSession, persistSession } from './sessionPersistence';

const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_startTransition: true,
} as const;

export default function App() {
  const [session, setSession] = useState<SessionPayload | null>(() => loadStoredSession());
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [companyErrorMessage, setCompanyErrorMessage] = useState<string | null>(null);
  const [publicCompanies, setPublicCompanies] = useState<{ company_id: string; route_no?: number; name: string }[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionRef = useRef<SessionPayload | null>(session);
  const clientRef = useRef<HttpClient | null>(null);

  useEffect(() => {
    sessionRef.current = session;
    if (session) {
      persistSession(session);
      return;
    }

    clearStoredSession();
  }, [session]);

  useEffect(() => {
    if (session) {
      setCompanyErrorMessage(null);
      return;
    }

    let ignore = false;
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
  }, [session]);

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
    });
  }

  const client = clientRef.current as HttpClient;

  async function handleLogin(credentials: { email: string; password: string }) {
    setIsSubmitting(true);
    setAuthError(null);
    setAuthStatusMessage(null);
    try {
      const nextSession = await login(credentials);
      sessionRef.current = nextSession;
      setSession(nextSession);
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
    }
  }

  if (!session) {
    return (
      <LoginPage
        companies={publicCompanies}
        companyErrorMessage={companyErrorMessage}
        errorMessage={authError}
        isLoadingCompanies={isLoadingCompanies}
        isSubmitting={isSubmitting}
        onLogin={handleLogin}
        onSignup={handleSignup}
        statusMessage={authStatusMessage}
      />
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

  return (
    <BrowserRouter future={ROUTER_FUTURE}>
      <RequireAdmin session={session} onLogout={handleLogout}>
        <Routes>
          <Route element={<Layout session={session} onLogout={handleLogout} />}>
            <Route path="/" element={<DashboardPage client={client} session={session} />} />
            <Route
              path="/account"
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
            <Route path="/accounts" element={<AccountsPage client={client} session={session} />} />
            <Route path="/organization" element={<Navigate replace to="/companies" />} />
            <Route path="/dispatch" element={<Navigate replace to="/dispatch/boards" />} />
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
            <Route
              path="/support"
              element={<SupportPage client={client} session={session} />}
            />
            <Route
              path="/notifications"
              element={<NotificationsPage client={client} session={session} />}
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
              path="/settlements"
              element={
                <RequireRoleScope
                  message="정산은 시스템 관리자, 회사 전체 관리자, 정산 관리자만 관리할 수 있습니다."
                  onLogout={handleLogout}
                  session={session}
                  title="정산 관리 권한 필요"
                  when={canAccessSettlementScope}
                >
                  <SettlementSectionLayout client={client} />
                </RequireRoleScope>
              }
            >
              <Route index element={<Navigate replace to="/settlements/overview" />} />
              <Route path="overview" element={<SettlementOverviewPage client={client} />} />
              <Route path="criteria" element={<SettlementCriteriaPage client={client} />} />
              <Route path="inputs" element={<SettlementInputsPage client={client} />} />
              <Route path="runs" element={<SettlementRunsPage client={client} />} />
              <Route path="results" element={<SettlementResultsPage client={client} />} />
            </Route>
            <Route path="*" element={<Navigate replace to="/" />} />
          </Route>
        </Routes>
      </RequireAdmin>
    </BrowserRouter>
  );
}
