import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { login, logout } from './api/auth';
import { createHttpClient, DEFAULT_API_BASE_URL, getErrorMessage, type HttpClient, type SessionPayload } from './api/http';
import { Layout } from './components/Layout';
import { RequireAdmin } from './components/RequireAdmin';
import { SettlementSectionLayout } from './components/SettlementSectionLayout';
import { AccountDetailPage } from './pages/AccountDetailPage';
import { AccountFormPage } from './pages/AccountFormPage';
import { AccountsPage } from './pages/AccountsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { CompanyFormPage } from './pages/CompanyFormPage';
import { DriverDetailPage } from './pages/DriverDetailPage';
import { DriverFormPage } from './pages/DriverFormPage';
import { DriversPage } from './pages/DriversPage';
import { FleetDetailPage } from './pages/FleetDetailPage';
import { FleetFormPage } from './pages/FleetFormPage';
import { LoginPage } from './pages/LoginPage';
import { SettlementCriteriaPage } from './pages/SettlementCriteriaPage';
import { SettlementInputsPage } from './pages/SettlementInputsPage';
import { SettlementOverviewPage } from './pages/SettlementOverviewPage';
import { SettlementResultsPage } from './pages/SettlementResultsPage';
import { SettlementRunsPage } from './pages/SettlementRunsPage';
import { TerminalsPage } from './pages/TerminalsPage';
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

  async function handleLogout() {
    try {
      await logout();
    } finally {
      sessionRef.current = null;
      setSession(null);
    }
  }

  if (!session) {
    return <LoginPage errorMessage={authError} isSubmitting={isSubmitting} onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter basename="/admin" future={ROUTER_FUTURE}>
      <RequireAdmin account={session.account} onLogout={handleLogout}>
        <Routes>
          <Route element={<Layout account={session.account} onLogout={handleLogout} />}>
            <Route path="/" element={<Navigate replace to="/accounts" />} />
            <Route path="/accounts" element={<AccountsPage client={client} />} />
            <Route path="/accounts/new" element={<AccountFormPage client={client} mode="create" />} />
            <Route path="/accounts/:accountRef" element={<AccountDetailPage client={client} />} />
            <Route path="/accounts/:accountRef/edit" element={<AccountFormPage client={client} mode="edit" />} />
            <Route path="/organization" element={<Navigate replace to="/companies" />} />
            <Route path="/companies" element={<CompaniesPage client={client} />} />
            <Route path="/companies/new" element={<CompanyFormPage client={client} mode="create" />} />
            <Route path="/companies/:companyRef" element={<CompanyDetailPage client={client} />} />
            <Route path="/companies/:companyRef/edit" element={<CompanyFormPage client={client} mode="edit" />} />
            <Route path="/companies/:companyRef/fleets/new" element={<FleetFormPage client={client} mode="create" />} />
            <Route path="/companies/:companyRef/fleets/:fleetRef" element={<FleetDetailPage client={client} />} />
            <Route path="/companies/:companyRef/fleets/:fleetRef/edit" element={<FleetFormPage client={client} mode="edit" />} />
            <Route path="/drivers" element={<DriversPage client={client} />} />
            <Route path="/drivers/new" element={<DriverFormPage account={session.account} client={client} mode="create" />} />
            <Route path="/drivers/:driverRef" element={<DriverDetailPage client={client} />} />
            <Route path="/drivers/:driverRef/edit" element={<DriverFormPage account={session.account} client={client} mode="edit" />} />
            <Route path="/vehicles" element={<VehiclesPage client={client} />} />
            <Route path="/vehicles/new" element={<VehicleFormPage client={client} mode="create" />} />
            <Route path="/vehicles/:vehicleRef" element={<VehicleDetailPage client={client} />} />
            <Route path="/vehicles/:vehicleRef/edit" element={<VehicleFormPage client={client} mode="edit" />} />
            <Route path="/vehicles/:vehicleRef/accesses/new" element={<VehicleOperatorAccessFormPage client={client} />} />
            <Route path="/terminals" element={<TerminalsPage client={client} />} />
            <Route path="/vehicle-assignments" element={<VehicleAssignmentsPage client={client} />} />
            <Route path="/settlements" element={<SettlementSectionLayout />}>
              <Route index element={<Navigate replace to="/settlements/overview" />} />
              <Route path="overview" element={<SettlementOverviewPage client={client} />} />
              <Route path="criteria" element={<SettlementCriteriaPage client={client} />} />
              <Route path="inputs" element={<SettlementInputsPage client={client} />} />
              <Route path="runs" element={<SettlementRunsPage client={client} />} />
              <Route path="results" element={<SettlementResultsPage client={client} />} />
            </Route>
            <Route path="*" element={<Navigate replace to="/accounts" />} />
          </Route>
        </Routes>
      </RequireAdmin>
    </BrowserRouter>
  );
}
