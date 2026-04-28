import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "@/shared/ui/screen-shell";
import { AuthButton } from "@/features/auth/auth-controls";
import { logoutIdentity } from "@/features/auth/auth-api";
import { useAuthSession } from "@/features/auth/auth-session";
import { clearAuthPreference } from "@/features/auth/auth-storage";

export function AdminEmptyScreen() {
  const { setSession } = useAuthSession();

  async function handleLogout() {
    await logoutIdentity().catch(() => undefined);
    await clearAuthPreference();
    setSession(null);
    router.replace("/login");
  }

  return (
    <ScreenShell
      title="system_admin"
      description="1차에서는 로그아웃 버튼만 있는 단일 빈 화면만 허용됩니다. 이 화면은 그 빈 surface를 bootstrap 단계에서 고정합니다."
    >
      <View style={styles.stack}>
        <View style={styles.emptyPanel}>
          <Text style={styles.text}>관리자 본문은 비어 있습니다.</Text>
        </View>
        <AuthButton
          label="로그아웃"
          tone="secondary"
          onPress={() => {
            void handleLogout();
          }}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    gap: 12,
  },
  emptyPanel: {
    flex: 1,
    minHeight: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d6d3d1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  text: {
    fontSize: 15,
    color: "#57534e",
  },
});
