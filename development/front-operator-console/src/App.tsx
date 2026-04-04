import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { login, logout, recoverIdentity, signupRequestIntake } from './api/auth';
import { createHttpClient, DEFAULT_API_BASE_URL, getErrorMessage, type HttpClient, type SessionPayload } from './api/http';
import { listPublicCompanies } from './api/organization';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { AccountPage } from './pages/AccountPage';
import { ConsentRecoveryPage } from './pages/ConsentRecoveryPage';
import { Driver360Page } from './pages/Driver360Page';
import { DriverFormPage } from './pages/DriverFormPage';
import { DriversPage } from './pages/DriversPage';
import { LoginPage } from './pages/LoginPage';
import { SettlementsPage } from './pages/SettlementsPage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
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

  const client = clientRef.current;

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

  async function handleRecover(payload: {
    name: string;
    birthDate: string;
    email: string;
    password: string;
    privacyPolicyConsented: boolean;
    locationPolicyConsented: boolean;
  }) {
    setIsSubmitting(true);
    setAuthError(null);
    setAuthStatusMessage(null);
    try {
      const nextSession = await recoverIdentity({
        name: payload.name,
        birth_date: payload.birthDate,
        email: payload.email,
        password: payload.password,
        privacy_policy_version: 'v1.0',
        privacy_policy_consented: payload.privacyPolicyConsented,
        location_policy_version: 'v1.0',
        location_policy_consented: payload.locationPolicyConsented,
      });
      sessionRef.current = nextSession;
      setSession(nextSession);
    } catch (error) {
      setAuthError(getErrorMessage(error, 'identity를 복구할 수 없습니다.'));
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
        onRecover={handleRecover}
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
          <h2>웹 접근 권한 설정 전입니다.</h2>
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
      <div className="auth-shell">
        <section className="auth-panel panel blocked-panel">
          <p className="panel-kicker">접근 제어</p>
          <h2>웹 권한이 없는 계정입니다.</h2>
          <p className="hero-copy">배송원 계정은 모바일 앱 전용입니다. 로그아웃 후 관리자 계정으로 다시 로그인하세요.</p>
          <button className="button primary" onClick={() => void handleLogout()} type="button">
            로그인 화면으로
          </button>
        </section>
      </div>
    );
  }

  return (
    <BrowserRouter future={ROUTER_FUTURE}>
      <Routes>
        <Route element={<Layout session={session} onLogout={handleLogout} />}>
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
          <Route path="/" element={<DashboardPage session={session} client={client} />} />
          <Route path="/drivers" element={<DriversPage client={client} />} />
          <Route path="/drivers/new" element={<DriverFormPage client={client} mode="create" />} />
          <Route path="/drivers/:driverRef" element={<Driver360Page client={client} />} />
          <Route path="/drivers/:driverRef/edit" element={<DriverFormPage client={client} mode="edit" />} />
          <Route path="/vehicles" element={<VehiclesPage client={client} />} />
          <Route path="/vehicles/:vehicleRef" element={<VehicleDetailPage client={client} />} />
          <Route path="/settlements" element={<SettlementsPage client={client} />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
