import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { appShell } from "@/core/config/app-shell";
import { ScreenShell } from "@/shared/ui/screen-shell";

import { AuthButton, AuthCheckboxRow, AuthMessage, AuthTextField } from "./auth-controls";
import { getErrorMessage, loginIdentity, logoutIdentity } from "./auth-api";
import {
  buildLoginPayload,
  createAuthPreference,
  resolveSuccessRoute,
  type LoginDraft,
} from "./auth-form";
import { useAuthSession } from "./auth-session";
import { saveAuthPreference } from "./auth-storage";

const INITIAL_DRAFT: LoginDraft = {
  email: "",
  password: "",
  rememberMe: false,
};

export function LoginScreen() {
  const {
    session,
    isBootstrapping,
    rememberedEmail,
    rememberedPreferenceEnabled,
    setSession,
  } = useAuthSession();
  const [draft, setDraft] = useState<LoginDraft>(INITIAL_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft((current) => {
      if (current.email || current.password) {
        return current;
      }
      return {
        ...current,
        email: rememberedEmail,
        rememberMe: rememberedPreferenceEnabled,
      };
    });
  }, [rememberedEmail, rememberedPreferenceEnabled]);

  useEffect(() => {
    if (isBootstrapping || !session) {
      return;
    }
    const targetRoute = resolveSuccessRoute(session.activeAccountType);
    if (targetRoute) {
      router.replace(targetRoute);
      return;
    }
    setErrorMessage("배송원 또는 system_admin 계정만 앱에 접근할 수 있습니다.");
  }, [isBootstrapping, session]);

  async function handleSubmit() {
    if (!draft.email.trim() || !draft.password) {
      setErrorMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const session = await loginIdentity(buildLoginPayload(draft));
      const targetRoute = resolveSuccessRoute(session.activeAccountType);

      if (!targetRoute) {
        await logoutIdentity().catch(() => undefined);
        setSession(null);
        setErrorMessage("배송원 또는 system_admin 계정만 앱에 접근할 수 있습니다.");
        return;
      }

      await saveAuthPreference(createAuthPreference(draft));
      setSession(session);
      router.replace(targetRoute);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={appShell.appName}
      title="천하운수 배송원 로그인"
      description="이메일과 비밀번호로 로그인합니다. 자동 로그인 체크 시 다음 실행에서 refresh session을 다시 확인합니다."
      scrollable
      keyboardAware
    >
      <View style={styles.stack}>
        <AuthTextField
          value={draft.email}
          placeholder="이메일"
          keyboardType="email-address"
          onChangeText={(email) => {
            setDraft((current) => ({ ...current, email }));
            setErrorMessage(null);
          }}
        />
        <AuthTextField
          value={draft.password}
          placeholder="비밀번호"
          secureTextEntry
          onChangeText={(password) => {
            setDraft((current) => ({ ...current, password }));
            setErrorMessage(null);
          }}
        />
        <AuthCheckboxRow
          checked={draft.rememberMe}
          label="자동 로그인"
          onPress={() => {
            setDraft((current) => ({
              ...current,
              rememberMe: !current.rememberMe,
            }));
            setErrorMessage(null);
          }}
        />

        {isBootstrapping ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#65724d" />
            <Text style={styles.loadingText}>저장된 세션을 확인하고 있습니다.</Text>
          </View>
        ) : null}

        {errorMessage ? <AuthMessage text={errorMessage} tone="error" /> : null}

        <AuthButton
          label={isSubmitting ? "로그인 중..." : "로그인"}
          disabled={isSubmitting || isBootstrapping}
          onPress={() => {
            void handleSubmit();
          }}
        />
        <AuthButton
          label="회원가입"
          tone="secondary"
          onPress={() => {
            router.push("/signup");
          }}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  loadingText: {
    fontSize: 14,
    color: "#57534e",
  },
});
