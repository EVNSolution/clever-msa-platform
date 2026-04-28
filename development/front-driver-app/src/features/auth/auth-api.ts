import { resolveApiUrl } from "@/core/config/runtime";

import type { SignupPayload } from "./auth-form";

type IdentitySessionResponse = {
  access_token: string;
  session_kind: string;
  email: string;
  identity: {
    identity_id: string;
    name: string;
    birth_date: string;
    status: string;
    contact_phone_number?: string | null;
  };
  active_account: {
    account_type: "system_admin" | "manager" | "driver";
    account_id: string;
    company_id?: string | null;
    role_type?: string | null;
  } | null;
  available_account_types: string[];
};

type SignupResponse = {
  identity_id: string;
  name: string;
  birth_date: string;
  status: string;
  requests: Array<{
    identity_signup_request_id: string;
    status: string;
  }>;
};

export type IdentitySession = {
  accessToken: string;
  sessionKind: string;
  email: string;
  activeAccountType: "system_admin" | "manager" | "driver" | null;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : undefined;
}

function readFirstDetailMessage(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = readFirstDetailMessage(item);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      const resolved = readFirstDetailMessage(nested);
      if (resolved) {
        return resolved;
      }
    }
  }
  return null;
}

function toApiError(response: Response, payload: unknown): ApiError {
  const message =
    readFirstDetailMessage(payload) ??
    (response.status >= 500
      ? "서버 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요."
      : "요청을 처리하지 못했습니다.");
  return new ApiError(response.status, message, payload);
}

function toIdentitySession(payload: IdentitySessionResponse): IdentitySession {
  return {
    accessToken: payload.access_token,
    sessionKind: payload.session_kind,
    email: payload.email,
    activeAccountType: payload.active_account?.account_type ?? null,
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message === "Failed to fetch"
      ? "서버에 연결할 수 없습니다. API base URL과 gateway 상태를 확인해 주세요."
      : error.message;
  }
  return "요청을 처리하지 못했습니다.";
}

export async function loginIdentity(payload: { email: string; password: string }): Promise<IdentitySession> {
  const response = await fetch(resolveApiUrl("/api/auth/identity-login/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body = (await parseResponse(response)) as IdentitySessionResponse | undefined;
  if (!response.ok || !body || !("access_token" in body)) {
    throw toApiError(response, body);
  }
  return toIdentitySession(body);
}

export async function refreshIdentitySession(): Promise<IdentitySession> {
  const response = await fetch(resolveApiUrl("/api/auth/identity-refresh/"), {
    method: "POST",
    credentials: "include",
  });
  const body = (await parseResponse(response)) as IdentitySessionResponse | undefined;
  if (!response.ok || !body || !("access_token" in body)) {
    throw toApiError(response, body);
  }
  return toIdentitySession(body);
}

export async function logoutIdentity(): Promise<void> {
  await fetch(resolveApiUrl("/api/auth/identity-logout/"), {
    method: "POST",
    credentials: "include",
  });
}

export async function signupIdentity(payload: SignupPayload): Promise<SignupResponse> {
  const response = await fetch(resolveApiUrl("/api/auth/identity-signup-requests/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body = (await parseResponse(response)) as SignupResponse | undefined;
  if (!response.ok || !body || !("identity_id" in body)) {
    throw toApiError(response, body);
  }
  return body;
}
