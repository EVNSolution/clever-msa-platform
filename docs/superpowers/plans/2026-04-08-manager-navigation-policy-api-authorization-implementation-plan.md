# Manager Navigation Policy API Authorization Implementation Plan

> **Goal:** 현재 `manager navigation policy`를 사이드바 노출에서 실제 API authorization까지 확장한다.

> **Architecture:** `service-account-access`가 effective navigation policy를 계산해서 identity access token claim에 넣고, 각 서비스는 자기 repo 안의 local helper로 `nav_item_key + action=view`를 해석해 API 접근을 거부한다. 서비스 간 공유 패키지는 만들지 않는다.

> **Tech Stack:** Django REST Framework, JWT session issuance in `development/service-account-access`, local authorization helpers in each `service-*` repo, existing `front-web-console` session/refresh flow

---

## Task 1: Extend identity session claims with navigation policy

**Files:**
- Modify: `development/service-account-access/accounts/services/jwt_service.py`
- Modify: `development/service-account-access/accounts/views.py`
- Modify: `development/service-account-access/accounts/session_principal.py` if claim hydration helper is needed
- Test: session/auth API tests in `development/service-account-access/accounts/tests/`

- [ ] Add failing tests for login/refresh payload containing navigation policy claims
- [ ] Add `allowed_nav_keys` and `navigation_policy_source` to access token payload
- [ ] Ensure login and refresh both issue tokens with latest effective policy
- [ ] Keep response payload shape stable for existing frontend consumers
- [ ] Commit backend auth contract changes

## Task 2: Add local authorization helper to `service-account-access`

**Files:**
- Create: `development/service-account-access/accounts/permissions_navigation.py`
- Modify: `development/service-account-access/accounts/views.py`
- Test: `development/service-account-access/accounts/tests/`

- [ ] Add failing tests for `accounts`-scoped API denial when nav key missing
- [ ] Implement `require_nav_access(principal, nav_item_key, action=\"view\")`
- [ ] Apply to account-management endpoints owned by `service-account-access`
- [ ] Leave self-service endpoints like `/identity-me/`, `/identity-profile/`, `/identity-password/` out of scope
- [ ] Commit

## Task 3: Define per-service `nav_item_key` mapping contract

**Files:**
- Create or modify service-local authorization helpers in each target repo
- Docs: `docs/runbooks/manager-navigation-policy.md`

- [ ] Record mapping for first rollout wave:
  - `service-organization-registry -> companies`
  - `service-region-registry -> regions`
  - `service-driver-profile -> drivers`
  - `service-personnel-document-registry -> personnel_documents`
  - `service-vehicle-registry -> vehicles`
  - `service-vehicle-assignment -> vehicle_assignments`
- [ ] Keep mapping local to each repo
- [ ] Commit docs alignment if needed

## Task 4: Roll out authorization helper to first service wave

**Files:**
- Target repos listed in Task 3

- [ ] For each repo, add failing tests for missing `allowed_nav_keys`
- [ ] Add local `require_nav_access` helper reading JWT/session claim
- [ ] Apply to read/list/detail endpoints first
- [ ] Return `403` with consistent message on denial
- [ ] Commit each repo independently

## Task 5: Frontend behavior alignment

**Files:**
- Modify: `development/front-web-console/src/api/http.ts`
- Modify: `development/front-web-console/src/App.tsx`
- Modify: affected page loaders if explicit 403 handling is needed

- [ ] Add consistent handling for authorization `403`
- [ ] Show role/policy denial message rather than generic failure where possible
- [ ] Keep sidebar filtering as first hint, backend `403` as final authority
- [ ] Commit frontend handling

## Task 6: Expand to dispatch and settlement wave

**Files:**
- `development/service-dispatch-registry`
- settlement-related service repos

- [ ] Apply same helper pattern to `dispatch`
- [ ] Apply same helper pattern to `settlements`
- [ ] Keep `action=view` only for this wave
- [ ] Commit repo-by-repo

## Task 7: Rollout and runbook

**Files:**
- Modify: `docs/runbooks/manager-navigation-policy.md`
- Create if needed: `docs/runbooks/manager-navigation-policy-api-authorization.md`

- [ ] Document stale-token behavior
- [ ] Document current rollout coverage by repo/nav key
- [ ] Document how to diagnose:
  - token claim mismatch
  - wrong company override
  - missing local mapping in service
- [ ] Deploy wave-by-wave in dev
- [ ] Record evidence links
