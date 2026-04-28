import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthButton, AuthMessage, AuthTextField } from "@/features/auth/auth-controls";
import { getErrorMessage, logoutIdentity } from "@/features/auth/auth-api";
import { useAuthSession } from "@/features/auth/auth-session";
import { clearAuthPreference } from "@/features/auth/auth-storage";
import { ScreenShell } from "@/shared/ui/screen-shell";

import { fetchWorkLogs } from "./work-logs-api";
import { buildDefaultWorkLogsRange } from "./work-logs-model";
import {
  buildPasswordChangePayload,
  resolveDriverLinkStatus,
  validatePasswordChangeDraft,
  type PasswordChangeDraft,
  type PasswordChangeErrors,
} from "./my-model";
import {
  fetchIdentityMe,
  fetchIdentityProfile,
  mergeMyProfile,
  updateIdentityPassword,
  type MyProfile,
} from "./my-api";

const INITIAL_PASSWORD_DRAFT: PasswordChangeDraft = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function MyScreen() {
  const { session, isBootstrapping, setSession } = useAuthSession();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [linkStatus, setLinkStatus] = useState<"linked" | "needs_link">("needs_link");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState<PasswordChangeDraft>(
    INITIAL_PASSWORD_DRAFT,
  );
  const [passwordErrors, setPasswordErrors] = useState<PasswordChangeErrors>({});
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    if (session.activeAccountType === "system_admin") {
      router.replace("/admin");
      return;
    }

    if (session.activeAccountType !== "driver") {
      router.replace("/login");
      return;
    }

    const currentSession = session;
    let cancelled = false;

    async function loadMyPage() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [me, identityProfile, workLogs] = await Promise.all([
          fetchIdentityMe(currentSession.accessToken),
          fetchIdentityProfile(currentSession.accessToken),
          fetchWorkLogs(currentSession.accessToken, buildDefaultWorkLogsRange()),
        ]);

        if (cancelled) {
          return;
        }

        setProfile(mergeMyProfile(me, identityProfile));
        setLinkStatus(resolveDriverLinkStatus(workLogs.status));
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMyPage();

    return () => {
      cancelled = true;
    };
  }, [isBootstrapping, session]);

  async function handleLogout() {
    await logoutIdentity().catch(() => undefined);
    await clearAuthPreference();
    setSession(null);
    router.replace("/login");
  }

  async function handlePasswordChange() {
    if (!session) {
      return;
    }

    const nextErrors = validatePasswordChangeDraft(passwordDraft);
    setPasswordErrors(nextErrors);
    setPasswordMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      await updateIdentityPassword(session.accessToken, buildPasswordChangePayload(passwordDraft));
      setPasswordDraft(INITIAL_PASSWORD_DRAFT);
      setPasswordMessage("비밀번호가 변경되었습니다.");
    } catch (error) {
      setPasswordMessage(getErrorMessage(error));
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  function handleLinkRequest() {
    console.debug("account_link_request_clicked", {
      identityId: profile?.identityId ?? null,
      linkStatus,
    });
  }

  return (
    <ScreenShell
      title="MY"
      description="배송원 전용 self-service 최소 영역입니다. 프로필, 연동 상태, 비밀번호 변경, 로그아웃만 제공합니다."
    >
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centerPanel}>
            <ActivityIndicator color="#65724d" />
            <Text style={styles.centerText}>MY 정보를 불러오고 있습니다.</Text>
          </View>
        ) : null}

        {!isLoading && errorMessage ? <AuthMessage text={errorMessage} tone="error" /> : null}

        {!isLoading && !errorMessage && profile ? (
          <ScrollView contentContainerStyle={styles.stack}>
            <View style={styles.row}>
              <Text style={styles.label}>이름</Text>
              <Text style={styles.value}>{profile.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>이메일</Text>
              <Text style={styles.value}>{profile.email}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>가입 연락처 전화번호</Text>
              <Text style={styles.value}>{profile.contactPhoneNumber ?? "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>계정 연동 상태</Text>
              <Text style={styles.value}>
                {linkStatus === "linked" ? "linked" : "needs_link"}
              </Text>
            </View>

            {linkStatus === "needs_link" ? (
              <View style={styles.row}>
                <Text style={styles.label}>연동 요청</Text>
                <Text style={styles.helperText}>
                  1차에서는 실제 요청을 보내지 않고 앱 내부 디버깅 로그만 남깁니다.
                </Text>
                <AuthButton
                  label="연동 필요 요청"
                  tone="secondary"
                  onPress={handleLinkRequest}
                />
              </View>
            ) : null}

            <View style={styles.passwordPanel}>
              <Text style={styles.panelTitle}>비밀번호 변경</Text>
              <AuthTextField
                value={passwordDraft.currentPassword}
                placeholder="현재 비밀번호"
                secureTextEntry
                onChangeText={(currentPassword) => {
                  setPasswordDraft((current) => ({ ...current, currentPassword }));
                  setPasswordErrors((current) => ({ ...current, currentPassword: undefined }));
                  setPasswordMessage(null);
                }}
                error={passwordErrors.currentPassword}
              />
              <AuthTextField
                value={passwordDraft.newPassword}
                placeholder="새 비밀번호"
                secureTextEntry
                onChangeText={(newPassword) => {
                  setPasswordDraft((current) => ({ ...current, newPassword }));
                  setPasswordErrors((current) => ({
                    ...current,
                    newPassword: undefined,
                    confirmPassword: undefined,
                  }));
                  setPasswordMessage(null);
                }}
                error={passwordErrors.newPassword}
              />
              <AuthTextField
                value={passwordDraft.confirmPassword}
                placeholder="새 비밀번호 확인"
                secureTextEntry
                onChangeText={(confirmPassword) => {
                  setPasswordDraft((current) => ({ ...current, confirmPassword }));
                  setPasswordErrors((current) => ({ ...current, confirmPassword: undefined }));
                  setPasswordMessage(null);
                }}
                error={passwordErrors.confirmPassword}
              />
              {passwordMessage ? (
                <AuthMessage
                  text={passwordMessage}
                  tone={passwordMessage === "비밀번호가 변경되었습니다." ? "success" : "error"}
                />
              ) : null}
              <AuthButton
                label={isPasswordSubmitting ? "변경 중..." : "비밀번호 변경"}
                disabled={isPasswordSubmitting}
                onPress={() => {
                  void handlePasswordChange();
                }}
              />
            </View>

            <AuthButton
              label="로그아웃"
              tone="secondary"
              onPress={() => {
                void handleLogout();
              }}
            />
          </ScrollView>
        ) : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stack: {
    gap: 12,
    paddingBottom: 20,
  },
  centerPanel: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centerText: {
    fontSize: 15,
    color: "#57534e",
  },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d6d3d1",
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#65724d",
  },
  value: {
    fontSize: 16,
    color: "#181818",
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#57534e",
  },
  passwordPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d6d3d1",
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#181818",
  },
});
