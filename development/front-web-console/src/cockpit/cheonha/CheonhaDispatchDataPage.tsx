import { useMemo, useRef, useState } from 'react';

import { clearStoredSession, loadStoredSession, persistSession } from '../../sessionPersistence';
import { createHttpClient, DEFAULT_API_BASE_URL, type HttpClient, type SessionPayload } from '../../api/http';
import { DispatchUploadsPage } from '../../pages/DispatchUploadsPage';
import { CheonhaRuleShellPanel } from './CheonhaRuleShellPanel';

export type CheonhaWorkspaceDependenciesProps = {
  client?: HttpClient;
  session?: SessionPayload | null;
};

export function useCheonhaWorkspaceDependencies({
  client,
  session,
}: CheonhaWorkspaceDependenciesProps) {
  const [storedSession, setStoredSession] = useState<SessionPayload | null>(() =>
    session !== undefined ? session : loadStoredSession(),
  );
  const resolvedSession = session ?? storedSession;
  const sessionRef = useRef<SessionPayload | null>(resolvedSession);

  sessionRef.current = resolvedSession;

  const resolvedClient = useMemo(() => {
    if (client) {
      return client;
    }

    return createHttpClient({
      baseUrl: DEFAULT_API_BASE_URL,
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      onSessionRefresh: (payload) => {
        sessionRef.current = payload;
        persistSession(payload);
        setStoredSession(payload);
      },
      onUnauthorized: () => {
        sessionRef.current = null;
        clearStoredSession();
        setStoredSession(null);
      },
    });
  }, [client]);

  return {
    client: resolvedClient,
    session: resolvedSession,
  };
}

export function CheonhaDispatchDataPage(props: CheonhaWorkspaceDependenciesProps) {
  const { client, session } = useCheonhaWorkspaceDependencies(props);

  if (!session) {
    return (
      <CheonhaRuleShellPanel
        description="세션이 없는 상태라 배차 데이터 워크플로우를 열 수 없습니다."
        title="배차 데이터"
      />
    );
  }

  return (
    <section
      className="cockpit-workspace-panel settlement-workspace-frame-panel"
      data-testid="settlement-workspace-panel"
    >
      <DispatchUploadsPage
        client={client}
        dispatchBoardsPath="/settlement/dispatch"
        layoutVariant="settlement"
        session={session}
        settlementInputsPath="/settlement/process"
      />
    </section>
  );
}
