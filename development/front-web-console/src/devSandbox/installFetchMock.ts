import {
  createLocalSandboxSettlementRun,
  deleteLocalSandboxSettlementRun,
  listLocalSandboxAllowedNavKeys,
  listLocalSandboxCompanies,
  listLocalSandboxDailySnapshots,
  listLocalSandboxDeliveryRecords,
  listLocalSandboxDispatchPlans,
  listLocalSandboxDrivers,
  listLocalSandboxFleets,
  listLocalSandboxLatestDriverSettlements,
  listLocalSandboxPublicCompanies,
  listLocalSandboxSettlementReadItems,
  listLocalSandboxSettlementReadRuns,
  listLocalSandboxSettlementRuns,
  resolveLocalSandboxSessionByEmail,
  resolveLocalSandboxSessionByToken,
  resolveLocalSandboxTenantContext,
  resolveLocalSandboxWorkspaceBootstrap,
  updateLocalSandboxSettlementRun,
} from './mockState';
import type { SettlementRun } from '../types';

type FetchLike = typeof fetch;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse({ code, message, details: {} }, status);
}

function isApiRequestPath(pathname: string): boolean {
  return /^\/api(?:\/|$)/.test(pathname);
}

function getRequestUrl(input: RequestInfo | URL, baseHref: string): URL {
  if (input instanceof Request) {
    return new URL(input.url, baseHref);
  }
  if (input instanceof URL) {
    return new URL(input.href);
  }
  return new URL(String(input), baseHref);
}

function readHeader(input: RequestInfo | URL, init: RequestInit | undefined, name: string): string | null {
  if (init?.headers) {
    return new Headers(init.headers).get(name);
  }
  if (input instanceof Request) {
    return input.headers.get(name);
  }
  return null;
}

async function readJsonBody(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  if (init?.body == null) {
    if (input instanceof Request) {
      const text = await input.clone().text();
      return text ? JSON.parse(text) : null;
    }
    return null;
  }

  if (typeof init.body === 'string') {
    return init.body ? JSON.parse(init.body) : null;
  }

  if (init.body instanceof URLSearchParams) {
    return Object.fromEntries(init.body.entries());
  }

  return null;
}

function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

function getAccessToken(input: RequestInfo | URL, init?: RequestInit): string | null {
  const authorization = readHeader(input, init, 'Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice('Bearer '.length);
}

async function handleApiRequest(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestUrl = getRequestUrl(input, window.location.href);
  const apiPath = requestUrl.pathname.replace(/^\/api/, '') || '/';
  const method = getMethod(input, init);

  if (method === 'POST' && apiPath === '/auth/identity-login/') {
    const body = (await readJsonBody(input, init)) as { email?: string } | null;
    const session = resolveLocalSandboxSessionByEmail(body?.email ?? '');
    if (!session) {
      return errorResponse(401, 'invalid_credentials', '이메일 또는 비밀번호를 확인해 주세요.');
    }
    return jsonResponse(session);
  }

  if (method === 'POST' && apiPath === '/auth/identity-logout/') {
    return new Response(null, { status: 204 });
  }

  if (method === 'GET' && apiPath === '/auth/identity-me/') {
    const session = resolveLocalSandboxSessionByToken(getAccessToken(input, init));
    return session ? jsonResponse(session) : errorResponse(401, 'unauthorized', '세션이 없습니다.');
  }

  if (method === 'POST' && apiPath === '/auth/identity-refresh/') {
    const session = resolveLocalSandboxSessionByToken(getAccessToken(input, init));
    return session ? jsonResponse(session) : errorResponse(401, 'unauthorized', '세션을 갱신할 수 없습니다.');
  }

  if (method === 'GET' && apiPath === '/auth/identity-navigation-policy/') {
    return jsonResponse({
      allowed_nav_keys: listLocalSandboxAllowedNavKeys(),
      source: 'local-sandbox',
    });
  }

  if (method === 'GET' && apiPath === '/auth/workspace-bootstrap/') {
    const tenantCode = requestUrl.searchParams.get('tenant_code');
    const payload = resolveLocalSandboxWorkspaceBootstrap(tenantCode);
    return payload
      ? jsonResponse({
          company_id: payload.companyId,
          company_name: payload.companyName,
          tenant_code: payload.tenantCode,
          workflow_profile: payload.workflowProfile,
          enabled_features: payload.enabledFeatures,
          home_dashboard_preset: payload.homeDashboardPreset,
          workspace_presets: payload.workspacePresets,
        })
      : errorResponse(404, 'workspace_not_found', '워크스페이스를 찾을 수 없습니다.');
  }

  if (method === 'GET' && apiPath === '/org/companies/public/') {
    return jsonResponse(listLocalSandboxPublicCompanies());
  }

  if (method === 'GET' && apiPath === '/org/companies/public/resolve/') {
    const tenantCode = requestUrl.searchParams.get('tenant_code') ?? '';
    const tenantContext = resolveLocalSandboxTenantContext(tenantCode);
    return tenantContext
      ? jsonResponse({
          company_id: tenantContext.companyId,
          company_name: tenantContext.companyName,
          tenant_code: tenantContext.tenantCode,
          workflow_profile: tenantContext.workflowProfile,
          enabled_features: tenantContext.enabledFeatures,
          home_dashboard_preset: tenantContext.homeDashboardPreset,
          workspace_presets: tenantContext.workspacePresets,
        })
      : errorResponse(404, 'tenant_not_found', '회사 서브도메인을 찾을 수 없습니다.');
  }

  if (method === 'GET' && apiPath === '/org/companies/') {
    return jsonResponse(listLocalSandboxCompanies());
  }

  if (method === 'GET' && apiPath === '/org/fleets/') {
    return jsonResponse(listLocalSandboxFleets());
  }

  if (method === 'GET' && apiPath === '/drivers/') {
    return jsonResponse(listLocalSandboxDrivers(requestUrl.searchParams));
  }

  if (method === 'GET' && apiPath === '/delivery-record/records/') {
    return jsonResponse(listLocalSandboxDeliveryRecords(requestUrl.searchParams));
  }

  if (method === 'GET' && apiPath === '/delivery-record/daily-snapshots/') {
    return jsonResponse(listLocalSandboxDailySnapshots(requestUrl.searchParams));
  }

  if (method === 'GET' && apiPath === '/settlements/runs/') {
    return jsonResponse(listLocalSandboxSettlementRuns(requestUrl.searchParams));
  }

  if (method === 'POST' && apiPath === '/settlements/runs/') {
    const body = await readJsonBody(input, init);
    return jsonResponse(createLocalSandboxSettlementRun(body as Omit<SettlementRun, 'settlement_run_id'>), 201);
  }

  if (apiPath.startsWith('/settlements/runs/') && apiPath.endsWith('/')) {
    const settlementRunSegments = apiPath.split('/').filter(Boolean);
    const settlementRunId = settlementRunSegments[settlementRunSegments.length - 1];
    if (!settlementRunId) {
      return errorResponse(404, 'settlement_run_not_found', '정산 실행을 찾을 수 없습니다.');
    }

    if (method === 'PATCH') {
      const body = await readJsonBody(input, init);
      const updatedRun = updateLocalSandboxSettlementRun(settlementRunId, body as Record<string, unknown>);
      return updatedRun
        ? jsonResponse(updatedRun)
        : errorResponse(404, 'settlement_run_not_found', '정산 실행을 찾을 수 없습니다.');
    }

    if (method === 'DELETE') {
      return deleteLocalSandboxSettlementRun(settlementRunId)
        ? new Response(null, { status: 204 })
        : errorResponse(404, 'settlement_run_not_found', '정산 실행을 찾을 수 없습니다.');
    }
  }

  if (method === 'GET' && apiPath === '/settlement-ops/runs/') {
    return jsonResponse(listLocalSandboxSettlementReadRuns(requestUrl.searchParams));
  }

  if (method === 'GET' && apiPath === '/settlement-ops/items/') {
    return jsonResponse(listLocalSandboxSettlementReadItems(requestUrl.searchParams));
  }

  if (method === 'GET' && apiPath === '/settlement-ops/drivers/latest-settlements/') {
    return jsonResponse(listLocalSandboxLatestDriverSettlements(requestUrl.searchParams));
  }

  if (method === 'GET' && apiPath === '/dispatch/plans/') {
    return jsonResponse(listLocalSandboxDispatchPlans(requestUrl.searchParams));
  }

  return errorResponse(404, 'local_sandbox_not_found', `지원되지 않는 local-sandbox API입니다: ${method} ${apiPath}`);
}

export function installFetchMock(): () => void {
  const originalFetch: FetchLike = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = getRequestUrl(input, window.location.href);
    if (!isApiRequestPath(requestUrl.pathname)) {
      return originalFetch(input, init);
    }

    return handleApiRequest(input, init);
  }) as FetchLike;

  return () => {
    globalThis.fetch = originalFetch;
  };
}
