import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { login, logout } from './api/auth';
import { createHttpClient, DEFAULT_API_BASE_URL, getErrorMessage, type HttpClient, type SessionPayload } from './api/http';
import { Layout } from './components/Layout';
import { RequireAdmin } from './components/RequireAdmin';
import { AccountsPage } from './pages/AccountsPage';
import { DriversPage } from './pages/DriversPage';
import { LoginPage } from './pages/LoginPage';
import { OrganizationPage } from './pages/OrganizationPage';
import { SettlementsPage } from './pages/SettlementsPage';
import { TerminalsPage } from './pages/TerminalsPage';
import { VehicleAssignmentsPage } from './pages/VehicleAssignmentsPage';
import { VehiclesPage } from './pages/VehiclesPage';

const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_startTransition: true,
} as const;

export default function App() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionRef = useRef<SessionPayload | null>(null);
  const clientRef = useRef<HttpClient | null>(null);

  useEffect(() => {
    sessionRef.current = session;
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
        setAuthError('Session expired. Please sign in again.');
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
      setAuthError(getErrorMessage(error, 'Unable to sign in.'));
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
            <Route path="/organization" element={<OrganizationPage client={client} />} />
            <Route path="/drivers" element={<DriversPage account={session.account} client={client} />} />
            <Route path="/vehicles" element={<VehiclesPage client={client} />} />
            <Route path="/terminals" element={<TerminalsPage client={client} />} />
            <Route path="/vehicle-assignments" element={<VehicleAssignmentsPage client={client} />} />
            <Route path="/settlements" element={<SettlementsPage client={client} />} />
            <Route path="*" element={<Navigate replace to="/accounts" />} />
          </Route>
        </Routes>
      </RequireAdmin>
    </BrowserRouter>
  );
}
