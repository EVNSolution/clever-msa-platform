import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ScreenShell } from "@/shared/ui/screen-shell";

import { AuthAgreementRow, AuthButton, AuthMessage, AuthTextField } from "./auth-controls";
import { getErrorMessage, signupIdentity } from "./auth-api";
import {
  buildSignupPayload,
  formatBirthDateInput,
  formatPhoneNumberInput,
  validateSignupField,
  validateSignupDraft,
  type SignupDraft,
  type SignupValidationField,
  type SignupValidationErrors,
} from "./auth-form";

const INITIAL_DRAFT: SignupDraft = {
  name: "",
  email: "",
  contactPhoneNumber: "",
  birthDate: "",
  password: "",
  passwordConfirm: "",
  privacyPolicyConsented: false,
  locationPolicyConsented: false,
};

export function SignupScreen() {
  const [draft, setDraft] = useState<SignupDraft>(INITIAL_DRAFT);
  const [errors, setErrors] = useState<SignupValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<SignupValidationField, boolean>>>(
    {},
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateField(field: SignupValidationField, nextDraft: SignupDraft) {
    setErrors((current) => ({
      ...current,
      [field]: validateSignupField(nextDraft, field),
    }));
  }

  function handleFieldBlur(field: SignupValidationField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
    validateField(field, draft);
  }

  function shouldValidateField(field: SignupValidationField) {
    return Boolean(touchedFields[field] || errors[field]);
  }

  function updateDraft(nextDraft: SignupDraft, field: SignupValidationField) {
    setDraft(nextDraft);
    setErrorMessage(null);

    if (shouldValidateField(field)) {
      validateField(field, nextDraft);
    } else {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  async function handleSubmit() {
    const nextErrors = validateSignupDraft(draft);
    setTouchedFields({
      name: true,
      email: true,
      contactPhoneNumber: true,
      birthDate: true,
      password: true,
      passwordConfirm: true,
      privacyPolicyConsented: true,
      locationPolicyConsented: true,
    });
    setErrors(nextErrors);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await signupIdentity(buildSignupPayload(draft));
      setSuccessMessage("회원가입이 완료되었습니다. 바로 로그인할 수 있습니다.");
      router.replace("/login");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenShell
      title="천하운수 회원가입"
      description="문맥은 cheonha로 고정입니다. 입력은 placeholder 중심으로 두고, 잘못된 값만 빨간 경고로 표시합니다."
      scrollable
      keyboardAware
    >
      <View style={styles.stack}>
        <AuthTextField
          value={draft.name}
          placeholder="이름"
          autoCapitalize="words"
          onChangeText={(name) => {
            const nextDraft = { ...draft, name };
            updateDraft(nextDraft, "name");
          }}
          onBlur={() => handleFieldBlur("name")}
          error={errors.name}
        />
        <AuthTextField
          value={draft.email}
          placeholder="이메일"
          keyboardType="email-address"
          onChangeText={(email) => {
            const nextDraft = { ...draft, email };
            updateDraft(nextDraft, "email");
          }}
          onBlur={() => handleFieldBlur("email")}
          error={errors.email}
        />
        <AuthTextField
          value={draft.contactPhoneNumber}
          placeholder="010-0000-0000"
          keyboardType="number-pad"
          onChangeText={(contactPhoneNumber) => {
            const nextDraft = {
              ...draft,
              contactPhoneNumber: formatPhoneNumberInput(contactPhoneNumber),
            };
            updateDraft(nextDraft, "contactPhoneNumber");
          }}
          onBlur={() => handleFieldBlur("contactPhoneNumber")}
          error={errors.contactPhoneNumber}
        />
        <AuthTextField
          value={draft.birthDate}
          placeholder="1900-01-01"
          keyboardType="number-pad"
          onChangeText={(birthDate) => {
            const nextDraft = {
              ...draft,
              birthDate: formatBirthDateInput(birthDate),
            };
            updateDraft(nextDraft, "birthDate");
          }}
          onBlur={() => handleFieldBlur("birthDate")}
          error={errors.birthDate}
        />
        <AuthTextField
          value={draft.password}
          placeholder="비밀번호"
          secureTextEntry
          onChangeText={(password) => {
            const nextDraft = { ...draft, password };
            setDraft(nextDraft);
            setErrorMessage(null);

            if (shouldValidateField("password")) {
              validateField("password", nextDraft);
            } else {
              setErrors((current) => ({ ...current, password: undefined }));
            }

            if (shouldValidateField("passwordConfirm")) {
              validateField("passwordConfirm", nextDraft);
            } else {
              setErrors((current) => ({ ...current, passwordConfirm: undefined }));
            }
          }}
          onBlur={() => handleFieldBlur("password")}
          error={errors.password}
        />
        <AuthTextField
          value={draft.passwordConfirm}
          placeholder="비밀번호 확인"
          secureTextEntry
          onChangeText={(passwordConfirm) => {
            const nextDraft = { ...draft, passwordConfirm };
            updateDraft(nextDraft, "passwordConfirm");
          }}
          onBlur={() => handleFieldBlur("passwordConfirm")}
          error={errors.passwordConfirm}
        />
        <AuthAgreementRow
          checked={draft.privacyPolicyConsented}
          label="서비스 이용에 대한 필수 동의"
          onPress={() => {
            const nextDraft = {
              ...draft,
              privacyPolicyConsented: !draft.privacyPolicyConsented,
            };
            updateDraft(nextDraft, "privacyPolicyConsented");
          }}
          onPressDetail={() => {
            console.debug("signup_detail_opened", { type: "service_terms" });
          }}
          error={errors.privacyPolicyConsented}
        />
        <AuthAgreementRow
          checked={draft.locationPolicyConsented}
          label="개인정보 처리에 대한 필수 동의"
          onPress={() => {
            const nextDraft = {
              ...draft,
              locationPolicyConsented: !draft.locationPolicyConsented,
            };
            updateDraft(nextDraft, "locationPolicyConsented");
          }}
          onPressDetail={() => {
            console.debug("signup_detail_opened", { type: "privacy_policy" });
          }}
          error={errors.locationPolicyConsented}
        />

        {errorMessage ? <AuthMessage text={errorMessage} tone="error" /> : null}
        {successMessage ? <AuthMessage text={successMessage} tone="success" /> : null}

        <AuthButton
          label={isSubmitting ? "회원가입 중..." : "회원가입"}
          disabled={isSubmitting}
          onPress={() => {
            void handleSubmit();
          }}
        />
        <AuthButton
          label="로그인으로 돌아가기"
          tone="secondary"
          onPress={() => {
            router.push("/login");
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
});
