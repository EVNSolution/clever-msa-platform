export const PUBLIC_API_BASE_URL = "https://api.ev-dashboard.com";

type ResolveApiBaseUrlInput = {
  configuredBaseUrl?: string | null;
  platform: string;
  isDev: boolean;
};

export function resolveApiBaseUrl({
  configuredBaseUrl,
  platform,
  isDev,
}: ResolveApiBaseUrlInput): string {
  const normalizedConfiguredBaseUrl = configuredBaseUrl?.trim();
  if (normalizedConfiguredBaseUrl) {
    return normalizedConfiguredBaseUrl;
  }

  if (!isDev) {
    return PUBLIC_API_BASE_URL;
  }

  if (platform === "android") {
    return "http://10.0.2.2:8080";
  }

  return "http://127.0.0.1:8080";
}
