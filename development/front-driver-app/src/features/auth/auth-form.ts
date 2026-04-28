export type LoginDraft = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type SignupDraft = {
  name: string;
  email: string;
  contactPhoneNumber: string;
  birthDate: string;
  password: string;
  passwordConfirm: string;
  privacyPolicyConsented: boolean;
  locationPolicyConsented: boolean;
};

export type AuthPreference = {
  rememberMe: boolean;
  lastEmail: string;
  logoutRequiredOnLaunch: boolean;
};

export type SignupPayload = {
  name: string;
  birth_date: string;
  email: string;
  password: string;
  contact_phone_number: string;
  tenant_code: string;
  request_types: string[];
  privacy_policy_version: string;
  privacy_policy_consented: boolean;
  location_policy_version: string;
  location_policy_consented: boolean;
};

export type SignupValidationErrors = Partial<
  Record<
    | "name"
    | "email"
    | "contactPhoneNumber"
    | "birthDate"
    | "password"
    | "passwordConfirm"
    | "privacyPolicyConsented"
    | "locationPolicyConsented",
    string
  >
>;

export type SignupValidationField = keyof SignupValidationErrors;

const TENANT_CODE = "cheonha";
const PRIVACY_POLICY_VERSION = "v1.0";
const LOCATION_POLICY_VERSION = "v1.0";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function trimText(value: string): string {
  return value.trim();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasValidPasswordComposition(value: string): boolean {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export function formatPhoneNumberInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function formatBirthDateInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function buildLoginPayload(draft: LoginDraft) {
  return {
    email: trimText(draft.email),
    password: draft.password,
  };
}

export function buildSignupPayload(draft: SignupDraft): SignupPayload {
  return {
    name: trimText(draft.name),
    birth_date: draft.birthDate,
    email: trimText(draft.email),
    password: draft.password,
    contact_phone_number: draft.contactPhoneNumber,
    tenant_code: TENANT_CODE,
    request_types: ["driver_account_create"],
    privacy_policy_version: PRIVACY_POLICY_VERSION,
    privacy_policy_consented: draft.privacyPolicyConsented,
    location_policy_version: LOCATION_POLICY_VERSION,
    location_policy_consented: draft.locationPolicyConsented,
  };
}

export function validateSignupField(
  draft: SignupDraft,
  field: SignupValidationField,
): string | undefined {
  const trimmedEmail = trimText(draft.email);

  switch (field) {
    case "name":
      return trimText(draft.name) ? undefined : "이름을 입력해 주세요.";
    case "email":
      if (!trimmedEmail) {
        return "이메일을 입력해 주세요.";
      }
      return isValidEmail(trimmedEmail) ? undefined : "이메일 형식을 확인해 주세요.";
    case "contactPhoneNumber":
      return digitsOnly(draft.contactPhoneNumber).length === 11
        ? undefined
        : "전화번호를 확인해 주세요.";
    case "birthDate":
      return digitsOnly(draft.birthDate).length === 8
        ? undefined
        : "생년월일을 확인해 주세요.";
    case "password":
      if (!draft.password) {
        return "비밀번호를 입력해 주세요.";
      }
      return hasValidPasswordComposition(draft.password)
        ? undefined
        : "비밀번호는 영문 대/소문자, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다.";
    case "passwordConfirm":
      return draft.password === draft.passwordConfirm
        ? undefined
        : "비밀번호가 일치하지 않습니다.";
    case "privacyPolicyConsented":
      return draft.privacyPolicyConsented ? undefined : "필수 동의가 필요합니다.";
    case "locationPolicyConsented":
      return draft.locationPolicyConsented ? undefined : "필수 동의가 필요합니다.";
  }
}

export function validateSignupDraft(draft: SignupDraft): SignupValidationErrors {
  const errors: SignupValidationErrors = {};
  const fields: SignupValidationField[] = [
    "name",
    "email",
    "contactPhoneNumber",
    "birthDate",
    "password",
    "passwordConfirm",
    "privacyPolicyConsented",
    "locationPolicyConsented",
  ];

  for (const field of fields) {
    const error = validateSignupField(draft, field);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
}

export function createAuthPreference(draft: LoginDraft): AuthPreference {
  return {
    rememberMe: draft.rememberMe,
    lastEmail: trimText(draft.email),
    logoutRequiredOnLaunch: !draft.rememberMe,
  };
}

export function resolveSuccessRoute(accountType: string | null | undefined): "/(driver)/work-logs" | "/admin" | null {
  if (accountType === "driver") {
    return "/(driver)/work-logs";
  }
  if (accountType === "system_admin") {
    return "/admin";
  }
  return null;
}
