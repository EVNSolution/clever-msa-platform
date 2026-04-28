import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPasswordChangePayload,
  resolveDriverLinkStatus,
  validatePasswordChangeDraft,
} from "./my-model";

test("resolveDriverLinkStatus keeps only linked and needs_link", () => {
  assert.equal(resolveDriverLinkStatus("linked"), "linked");
  assert.equal(resolveDriverLinkStatus("needs_link"), "needs_link");
  assert.equal(resolveDriverLinkStatus(undefined), "needs_link");
});

test("buildPasswordChangePayload trims current password and keeps new password", () => {
  assert.deepEqual(
    buildPasswordChangePayload({
      currentPassword: " current-pass ",
      newPassword: "NewPass12!",
      confirmPassword: "NewPass12!",
    }),
    {
      current_password: "current-pass",
      new_password: "NewPass12!",
    },
  );
});

test("validatePasswordChangeDraft reports missing current password and mismatched confirmation", () => {
  assert.deepEqual(
    validatePasswordChangeDraft({
      currentPassword: "",
      newPassword: "NewPass12!",
      confirmPassword: "Mismatch12!",
    }),
    {
      currentPassword: "현재 비밀번호를 입력해 주세요.",
      confirmPassword: "비밀번호가 일치하지 않습니다.",
    },
  );
});
