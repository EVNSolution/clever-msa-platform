import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { login, logout } from './api/auth';
import { createHttpClient, DEFAULT_API_BASE_URL, getErrorMessage, type HttpClient, type SessionPayload } from './api/http';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { Driver360Page } from './pages/Driver360Page';
import { DriversPage } from './pages/DriversPage';
import { LoginPage } from './pages/LoginPage';
import { SettlementsPage } from './pages/SettlementsPage';
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

  const client = clientRef.current;

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
    <BrowserRouter future={ROUTER_FUTURE}>
      <Routes>
        <Route element={<Layout account={session.account} onLogout={handleLogout} />}>
          <Route path="/" element={<DashboardPage account={session.account} client={client} />} />
          <Route path="/drivers" element={<DriversPage account={session.account} client={client} />} />
          <Route path="/drivers/:driverId" element={<Driver360Page client={client} />} />
          <Route path="/vehicles" element={<VehiclesPage client={client} />} />
          <Route path="/settlements" element={<SettlementsPage client={client} />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
