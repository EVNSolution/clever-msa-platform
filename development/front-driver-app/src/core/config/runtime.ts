import Constants from "expo-constants";
import { Platform } from "react-native";

import { resolveApiBaseUrl } from "./api-base-url";

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export const runtimeConfig = {
  tenantCode: String(Constants.expoConfig?.extra?.tenantCode ?? "cheonha"),
  apiBaseUrl: resolveApiBaseUrl({
    configuredBaseUrl,
    platform: Platform.OS,
    isDev: __DEV__,
  }),
} as const;

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${runtimeConfig.apiBaseUrl}${normalizedPath}`;
}
