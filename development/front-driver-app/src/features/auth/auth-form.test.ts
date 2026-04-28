import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLoginPayload,
  buildSignupPayload,
  createAuthPreference,
  formatBirthDateInput,
  formatPhoneNumberInput,
  resolveSuccessRoute,
  validateSignupField,
  validateSignupDraft,
  type SignupDraft,
} from "./auth-form";

function createValidSignupDraft(): SignupDraft {
  return {
    name: "천하 기사",
    email: " driver@cheonha.com ",
    contactPhoneNumber: "010-1234-5678",
    birthDate: "1990-01-01",
    password: "Signup12!",
    passwordConfirm: "Signup12!",
    privacyPolicyConsented: true,
    locationPolicyConsented: true,
  };
}

test("formatPhoneNumberInput keeps only digits and applies 3-4-4 masking", () => {
  assert.equal(formatPhoneNumberInput("01012a34-5678"), "010-1234-5678");
  assert.equal(formatPhoneNumberInput("010123"), "010-123");
});

test("formatBirthDateInput keeps only digits and applies YYYY-MM-DD masking", () => {
  assert.equal(formatBirthDateInput("19900101"), "1990-01-01");
  assert.equal(formatBirthDateInput("1990a101"), "1990-10-1");
});

test("buildLoginPayload trims the email and keeps password fields only", () => {
  assert.deepEqual(
    buildLoginPayload({
      email: " driver@cheonha.com ",
      password: "Login12!",
      rememberMe: true,
    }),
    {
      email: "driver@cheonha.com",
      password: "Login12!",
    },
  );
});

test("buildSignupPayload fixes tenant and consent contract for cheonha driver signup", () => {
  assert.deepEqual(buildSignupPayload(createValidSignupDraft()), {
    name: "천하 기사",
    birth_date: "1990-01-01",
    email: "driver@cheonha.com",
    password: "Signup12!",
    contact_phone_number: "010-1234-5678",
    tenant_code: "cheonha",
    request_types: ["driver_account_create"],
    privacy_policy_version: "v1.0",
    privacy_policy_consented: true,
    location_policy_version: "v1.0",
    location_policy_consented: true,
  });
});

test("validateSignupDraft reports the minimum blocking errors", () => {
  assert.deepEqual(
    validateSignupDraft({
      ...createValidSignupDraft(),
      passwordConfirm: "Mismatch12!",
      privacyPolicyConsented: false,
    }),
    {
      passwordConfirm: "비밀번호가 일치하지 않습니다.",
      privacyPolicyConsented: "필수 동의가 필요합니다.",
    },
  );
});

test("validateSignupDraft rejects invalid email format", () => {
  assert.deepEqual(
    validateSignupDraft({
      ...createValidSignupDraft(),
      email: "driver-at-cheonha.com",
    }),
    {
      email: "이메일 형식을 확인해 주세요.",
    },
  );
});

test("validateSignupDraft requires upper/lower/digit/special password composition", () => {
  assert.deepEqual(
    validateSignupDraft({
      ...createValidSignupDraft(),
      password: "password12",
      passwordConfirm: "password12",
    }),
    {
      password: "비밀번호는 영문 대/소문자, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다.",
    },
  );
});

test("validateSignupField only reports the invalid email field", () => {
  assert.equal(
    validateSignupField(
      {
        ...createValidSignupDraft(),
        email: "driver-at-cheonha.com",
      },
      "email",
    ),
    "이메일 형식을 확인해 주세요.",
  );
  assert.equal(
    validateSignupField(
      {
        ...createValidSignupDraft(),
        email: "driver-at-cheonha.com",
      },
      "name",
    ),
    undefined,
  );
});

test("validateSignupField uses the stricter password composition and confirm match rules", () => {
  const weakPasswordDraft = {
    ...createValidSignupDraft(),
    password: "password12",
    passwordConfirm: "password12",
  };

  assert.equal(
    validateSignupField(weakPasswordDraft, "password"),
    "비밀번호는 영문 대/소문자, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다.",
  );

  assert.equal(
    validateSignupField(
      {
        ...createValidSignupDraft(),
        passwordConfirm: "Mismatch12!",
      },
      "passwordConfirm",
    ),
    "비밀번호가 일치하지 않습니다.",
  );
});

test("createAuthPreference flips logoutRequiredOnLaunch when remember me is off", () => {
  assert.deepEqual(
    createAuthPreference({
      email: "driver@cheonha.com",
      password: "Login12!",
      rememberMe: false,
    }),
    {
      rememberMe: false,
      lastEmail: "driver@cheonha.com",
      logoutRequiredOnLaunch: true,
    },
  );
});

test("resolveSuccessRoute only allows driver and system admin app entries", () => {
  assert.equal(resolveSuccessRoute("driver"), "/(driver)/work-logs");
  assert.equal(resolveSuccessRoute("system_admin"), "/admin");
  assert.equal(resolveSuccessRoute("manager"), null);
});
