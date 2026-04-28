import assert from "node:assert/strict";
import test from "node:test";

import { resolveApiBaseUrl } from "./api-base-url";

test("release builds default to the public API host on real devices", () => {
  assert.equal(
    resolveApiBaseUrl({
      configuredBaseUrl: "",
      platform: "android",
      isDev: false,
    }),
    "https://api.ev-dashboard.com",
  );
});

test("development builds keep emulator and simulator loopback defaults", () => {
  assert.equal(
    resolveApiBaseUrl({
      configuredBaseUrl: "",
      platform: "android",
      isDev: true,
    }),
    "http://10.0.2.2:8080",
  );

  assert.equal(
    resolveApiBaseUrl({
      configuredBaseUrl: "",
      platform: "ios",
      isDev: true,
    }),
    "http://127.0.0.1:8080",
  );
});

test("explicit EXPO_PUBLIC_API_BASE_URL overrides the default selection", () => {
  assert.equal(
    resolveApiBaseUrl({
      configuredBaseUrl: " https://staging.example.com ",
      platform: "android",
      isDev: false,
    }),
    "https://staging.example.com",
  );
});
