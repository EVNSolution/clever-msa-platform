# Dispatch Upload Scope And Password Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배차표 업로드 회사 scope를 서버 강제로 닫고, 비밀번호 규칙을 계정 생성/변경 API에서 서버 강제한다.

**Architecture:** `service-dispatch-registry`는 JWT payload의 `active_account_type`, `company_id`, `role_type`를 읽어 upload preview/list scope를 결정한다. `service-account-access`는 공통 비밀번호 규칙 validator를 도입해 signup intake, recovery, password update serializer에서 재사용한다.

**Tech Stack:** Django REST Framework, Django ORM, JWT payload, existing CLEVER auth/session model, Django tests

---

### Task 1: Dispatch Upload Scope Enforcement

**Files:**
- Modify: `development/service-dispatch-registry/dispatch/serializers.py`
- Modify: `development/service-dispatch-registry/dispatch/views.py`
- Test: `development/service-dispatch-registry/dispatch/tests/test_dispatch_upload_api.py`

- [x] **Step 1: Write failing tests for manager company scope enforcement**
- [x] **Step 2: Run dispatch upload tests and confirm RED**
- [x] **Step 3: Reuse `request.auth` JWT payload instead of expanding `AuthenticatedPrincipal`**
- [x] **Step 4: Enforce authenticated company scope in upload preview request validation**
- [x] **Step 5: Enforce authenticated company scope in upload batch list filtering**
- [x] **Step 6: Run dispatch upload tests and confirm GREEN**

### Task 2: Password Policy Validator

**Files:**
- Modify: `development/service-account-access/accounts/serializers.py`
- Test: `development/service-account-access/accounts/tests/test_auth_api.py`

- [x] **Step 1: Write failing tests for weak password rejection in signup, recovery, password change**
- [x] **Step 2: Run focused auth API tests and confirm RED**
- [x] **Step 3: Add a shared password policy validator in `accounts/serializers.py`**
- [x] **Step 4: Apply the validator to signup intake, identity recovery, identity password serializers**
- [x] **Step 5: Run focused auth API tests and confirm GREEN**

### Task 3: Verification

**Files:**
- No code changes expected

- [x] **Step 1: Run focused dispatch upload tests**
- [x] **Step 2: Run focused auth API tests**
- [x] **Step 3: Re-run any impacted front-end upload tests only if server contract changes require it**
- [x] **Step 4: Summarize exact commands and results before any completion claim**

### Implementation Notes

- `service-dispatch-registry`는 `dispatch/authentication.py`를 건드리지 않고, 이미 유지되던 `request.auth` payload를 그대로 사용했다.
- `service-account-access` 비밀번호 규칙은 별도 모듈 분리 대신 `accounts/serializers.py` 내부 helper로 먼저 닫았다.
- 로그인은 기존 계정 호환성을 위해 규칙 강제 대상에서 제외했다.

### Verification Results

- `service-dispatch-registry`
  - `./.venv/bin/python manage.py test dispatch.tests.test_dispatch_upload_api -v 2`
  - `7 passed`
- `service-account-access`
  - `set -a && source ../integration-local-stack/infra/env/host/account-auth.env.example && set +a && ./.venv/bin/python manage.py test accounts.tests.test_auth_api.SignupIntakeApiTests accounts.tests.test_auth_api.IdentityLoginMethodApiTests -v 2`
  - `15 passed`
- `service-account-access` focused tests required temporary local infra startup (`account-db`, `redis`) and the infra was shut down again after verification.
