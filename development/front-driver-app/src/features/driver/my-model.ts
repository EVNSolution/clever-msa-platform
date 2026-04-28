export type DriverLinkStatus = "linked" | "needs_link";

export type PasswordChangeDraft = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordChangeErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword", string>
>;

function trimText(value: string): string {
  return value.trim();
}

export function resolveDriverLinkStatus(value: string | null | undefined): DriverLinkStatus {
  return value === "linked" ? "linked" : "needs_link";
}

export function buildPasswordChangePayload(draft: PasswordChangeDraft) {
  return {
    current_password: trimText(draft.currentPassword),
    new_password: draft.newPassword,
  };
}

export function validatePasswordChangeDraft(draft: PasswordChangeDraft): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {};

  if (!trimText(draft.currentPassword)) {
    errors.currentPassword = "현재 비밀번호를 입력해 주세요.";
  }
  if (!draft.newPassword) {
    errors.newPassword = "새 비밀번호를 입력해 주세요.";
  }
  if (draft.newPassword !== draft.confirmPassword) {
    errors.confirmPassword = "비밀번호가 일치하지 않습니다.";
  }

  return errors;
}
