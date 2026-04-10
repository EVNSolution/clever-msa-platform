# Dispatch Upload Scope And Password Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배차표 업로드 회사 scope를 서버 강제로 닫고, 비밀번호 규칙을 계정 생성/변경 API에서 서버 강제한다.

**Architecture:** `service-dispatch-registry`는 JWT payload의 `active_account_type`, `company_id`, `role_type`를 읽어 upload preview/list scope를 결정한다. `service-account-access`는 공통 비밀번호 규칙 validator를 도입해 signup intake, recovery, password update serializer에서 재사용한다.

**Tech Stack:** Django REST Framework, Django ORM, JWT payload, existing CLEVER auth/session model, Django tests

---

### Task 1: Dispatch Upload Scope Enforcement

**Files:**
- Modify: `development/service-dispatch-registry/dispatch/authentication.py`
- Modify: `development/service-dispatch-registry/dispatch/serializers.py`
- Modify: `development/service-dispatch-registry/dispatch/views.py`
- Test: `development/service-dispatch-registry/dispatch/tests/test_dispatch_upload_api.py`

- [ ] **Step 1: Write failing tests for manager company scope enforcement**
- [ ] **Step 2: Run dispatch upload tests and confirm RED**
- [ ] **Step 3: Preserve `company_id`, `active_account_type`, `role_type` on authenticated principal or helper access**
- [ ] **Step 4: Enforce authenticated company scope in upload preview request validation**
- [ ] **Step 5: Enforce authenticated company scope in upload batch list filtering**
- [ ] **Step 6: Run dispatch upload tests and confirm GREEN**

### Task 2: Password Policy Validator

**Files:**
- Create: `development/service-account-access/accounts/password_policy.py`
- Modify: `development/service-account-access/accounts/serializers.py`
- Test: `development/service-account-access/accounts/tests/test_auth_api.py`

- [ ] **Step 1: Write failing tests for weak password rejection in signup, recovery, password change**
- [ ] **Step 2: Run focused auth API tests and confirm RED**
- [ ] **Step 3: Add a shared password policy validator**
- [ ] **Step 4: Apply the validator to signup intake, identity recovery, identity password serializers**
- [ ] **Step 5: Run focused auth API tests and confirm GREEN**

### Task 3: Verification

**Files:**
- No code changes expected

- [ ] **Step 1: Run focused dispatch upload tests**
- [ ] **Step 2: Run focused auth API tests**
- [ ] **Step 3: Re-run any impacted front-end upload tests only if server contract changes require it**
- [ ] **Step 4: Summarize exact commands and results before any completion claim**
