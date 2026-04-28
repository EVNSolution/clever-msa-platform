import { resolveApiUrl } from "@/core/config/runtime";
import { ApiError } from "@/features/auth/auth-api";

import { type WorkLogsRange } from "./work-logs-model";

type WorkLogsResponse = {
  status?: string;
  logs?: Array<{
    date?: string;
    attendance?: {
      final_status?: string;
    };
    delivery_history?: {
      delivery_count?: number;
      source_record_count?: number;
      status?: string;
    };
  }>;
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

function toApiError(response: Response, payload: unknown): ApiError {
  const message =
    payload && typeof payload === "object" && "detail" in payload
      ? String((payload as { detail: string }).detail)
      : response.status >= 500
        ? "업무기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "업무기록 요청을 처리하지 못했습니다.";
  return new ApiError(response.status, message, payload);
}

export async function fetchWorkLogs(accessToken: string, range: WorkLogsRange): Promise<WorkLogsResponse> {
  const searchParams = new URLSearchParams({
    date_from: range.dateFrom,
    date_to: range.dateTo,
  });

  const response = await fetch(
    resolveApiUrl(`/api/driver-ops/me/work-logs/?${searchParams.toString()}`),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = (await parseResponse(response)) as WorkLogsResponse | undefined;
  if (!response.ok) {
    throw toApiError(response, payload);
  }
  return payload ?? {};
}
