import { useEffect, useMemo, useState } from 'react';

import { getNavigationPolicy } from '../api/navigationPolicy';
import type { HttpClient, SessionPayload } from '../api/http';
import { getErrorMessage } from '../api/http';
import { allNavItemKeys, getDefaultAllowedNavKeys, type NavItemKey } from '../authScopes';

type NavigationPolicyState = {
  allowedNavKeys: NavItemKey[];
  isLoading: boolean;
  errorMessage: string | null;
  source: string;
};

type StoredNavigationPolicyState = NavigationPolicyState & {
  sessionKey: string | null;
};

function filterSupportedNavKeys(navKeys: readonly string[]): NavItemKey[] {
  return allNavItemKeys.filter((key) => navKeys.includes(key));
}

function getSessionKey(session: SessionPayload | null) {
  if (session === null) {
    return null;
  }

  return [
    session.identity.identityId,
    session.activeAccount?.accountId ?? 'no-account',
    session.sessionKind,
  ].join(':');
}

export function useNavigationPolicy(client: HttpClient, session: SessionPayload | null): NavigationPolicyState {
  return useNavigationPolicyWithRefresh(client, session, 0);
}

export function useNavigationPolicyWithRefresh(
  client: HttpClient,
  session: SessionPayload | null,
  refreshTick: number,
): NavigationPolicyState {
  const sessionKey = getSessionKey(session);
  const fallbackKeys = useMemo(
    () => (session ? getDefaultAllowedNavKeys(session) : []),
    [session, sessionKey],
  );

  const [state, setState] = useState<StoredNavigationPolicyState>(() => ({
    allowedNavKeys: fallbackKeys,
    isLoading: Boolean(sessionKey),
    errorMessage: null,
    source: sessionKey ? 'fallback' : 'none',
    sessionKey,
  }));

  const effectiveState: NavigationPolicyState =
    state.sessionKey === sessionKey
      ? state
      : {
          allowedNavKeys: fallbackKeys,
          isLoading: Boolean(sessionKey),
          errorMessage: null,
          source: sessionKey ? 'fallback' : 'none',
        };

  useEffect(() => {
    let ignore = false;
    if (session === null) {
      setState({
        allowedNavKeys: [],
        isLoading: false,
        errorMessage: null,
        source: 'none',
        sessionKey: null,
      });
      return () => {
        ignore = true;
      };
    }

    setState({
      allowedNavKeys: fallbackKeys,
      isLoading: true,
      errorMessage: null,
      source: 'fallback',
      sessionKey,
    });

    void getNavigationPolicy(client)
      .then((policy) => {
        if (ignore) {
          return;
        }
        setState({
          allowedNavKeys: filterSupportedNavKeys(policy.allowed_nav_keys),
          isLoading: false,
          errorMessage: null,
          source: policy.source,
          sessionKey,
        });
      })
      .catch((error) => {
        if (ignore) {
          return;
        }
        setState({
          allowedNavKeys: fallbackKeys,
          isLoading: false,
          errorMessage: getErrorMessage(error, '관리자 메뉴 정책을 불러올 수 없습니다.'),
          source: 'fallback',
          sessionKey,
        });
      });

    return () => {
      ignore = true;
    };
  }, [client, fallbackKeys, refreshTick, session, sessionKey]);

  return effectiveState;
}
