import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthSessionProvider } from "@/features/auth/auth-session";

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthSessionProvider>
  );
}
