import { resolveApiUrl } from "@/core/config/runtime";
import { ApiError } from "@/features/auth/auth-api";

type IdentityMeResponse = {
  email: string;
  identity: {
    identity_id: string;
    name: string;
    birth_date: string;
    status: string;
    contact_phone_number?: string | null;
  };
};

type IdentityProfileResponse = {
  identity_id: string;
  name: string;
  birth_date: string;
  status: string;
  contact_phone_number?: string | null;
};

export type MyProfile = {
  identityId: string;
  name: string;
  email: string;
  contactPhoneNumber: string | null;
  birthDate: string;
  status: string;
};

type PasswordChangePayload = {
  current_password: string;
  new_password: string;
};

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
  return new ApiError(
    response.status,
    readFirstDetailMessage(payload) ??
      (response.status >= 500
        ? "MY 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "요청을 처리하지 못했습니다."),
    payload,
  );
}

function createAuthorizedInit(accessToken: string, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };
}

export async function fetchIdentityMe(accessToken: string): Promise<IdentityMeResponse> {
  const response = await fetch(
    resolveApiUrl("/api/auth/identity-me/"),
    createAuthorizedInit(accessToken, {
      method: "GET",
    }),
  );
  const payload = (await parseResponse(response)) as IdentityMeResponse | undefined;
  if (!response.ok || !payload?.identity?.identity_id) {
    throw toApiError(response, payload);
  }
  return payload;
}

export async function fetchIdentityProfile(accessToken: string): Promise<IdentityProfileResponse> {
  const response = await fetch(
    resolveApiUrl("/api/auth/identity-profile/"),
    createAuthorizedInit(accessToken, {
      method: "GET",
    }),
  );
  const payload = (await parseResponse(response)) as IdentityProfileResponse | undefined;
  if (!response.ok || !payload?.identity_id) {
    throw toApiError(response, payload);
  }
  return payload;
}

export async function updateIdentityPassword(
  accessToken: string,
  payload: PasswordChangePayload,
): Promise<void> {
  const response = await fetch(
    resolveApiUrl("/api/auth/identity-password/"),
    createAuthorizedInit(accessToken, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  );
  const body = await parseResponse(response);
  if (!response.ok) {
    throw toApiError(response, body);
  }
}

export function mergeMyProfile(me: IdentityMeResponse, profile: IdentityProfileResponse): MyProfile {
  return {
    identityId: profile.identity_id,
    name: profile.name,
    email: me.email,
    contactPhoneNumber: profile.contact_phone_number ?? me.identity.contact_phone_number ?? null,
    birthDate: profile.birth_date,
    status: profile.status,
  };
}
