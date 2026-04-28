import * as SecureStore from "expo-secure-store";

import type { AuthPreference } from "./auth-form";

const AUTH_PREFERENCE_KEY = "cheonha-driver-auth-preference";

export async function loadAuthPreference(): Promise<AuthPreference | null> {
  const rawValue = await SecureStore.getItemAsync(AUTH_PREFERENCE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AuthPreference>;
    if (typeof parsed.lastEmail !== "string" || typeof parsed.rememberMe !== "boolean") {
      return null;
    }
    return {
      lastEmail: parsed.lastEmail,
      rememberMe: parsed.rememberMe,
      logoutRequiredOnLaunch: parsed.logoutRequiredOnLaunch === true,
    };
  } catch {
    return null;
  }
}

export async function saveAuthPreference(preference: AuthPreference): Promise<void> {
  await SecureStore.setItemAsync(AUTH_PREFERENCE_KEY, JSON.stringify(preference));
}

export async function clearAuthPreference(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_PREFERENCE_KEY);
}
