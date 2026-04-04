# Auth Transition Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-account-access`에서 identity-first auth를 정본으로 고정하면서, 현재 웹 콘솔이 깨지지 않도록 legacy auth compatibility phase 1을 구현한다.

**Architecture:** 새 self-service/signup/login 흐름은 `identity-*`를 정본으로 유지한다. legacy `Account`는 사람/권한 정본이 아니라 web compatibility projection으로 재해석하고, manager/system_admin 계정 변화에 맞춰 projection을 sync한다. public `register`는 닫고, legacy `/auth/*`는 phase 1 동안만 유지한다.

**Tech Stack:** Django, Django REST Framework, existing auth models/services/tests, OpenAPI refresh script

---

### Task 1: 전환기 문서와 runtime boundary 고정

**Files:**
- Create: `docs/decisions/specs/2026-04-04-auth-transition-phase-1-design.md`
- Create: `docs/rollout/plans/2026-04-04-auth-transition-phase-1-implementation-plan.md`
- Modify: `docs/rollout/README.md`

- [ ] `phase 1`에서 정본과 호환층을 문서로 분리한다.
- [ ] legacy `/auth/register` 종료와 `Account compatibility projection` 의미를 문서에 명시한다.
- [ ] rollout README에 active plan entry를 추가한다.

### Task 2: projection sync failing test 추가

**Files:**
- Modify: `development/service-account-access/accounts/tests/test_auth_api.py`
- Test: `development/service-account-access/accounts/tests/test_auth_api.py`

- [ ] manager setup 완료 후 legacy `Account` projection이 생성되는 failing test를 쓴다.
- [ ] `identity-password` 변경이 legacy login에 반영되는 failing test를 쓴다.
- [ ] 마지막 로그인 수단 삭제 시 projection이 scrub/deactivate 되는 failing test를 쓴다.
- [ ] `POST /register/`가 더 이상 public signup으로 동작하지 않는 failing test를 쓴다.

### Task 3: legacy account projection service 구현

**Files:**
- Create: `development/service-account-access/accounts/services/legacy_account_projection_service.py`
- Modify: `development/service-account-access/accounts/models.py`
- Modify: `development/service-account-access/accounts/migrations/`

- [ ] `Account`를 `identity` 기반 projection으로 link할 수 있게 최소 필드를 추가한다.
- [ ] projection 생성/재사용/scrub 정책을 서비스로 캡슐화한다.
- [ ] verified email, password, web-eligible account 상태에 따라 projection active 여부를 계산한다.

### Task 4: projection sync 호출 지점 연결

**Files:**
- Modify: `development/service-account-access/accounts/services/signup_request_service.py`
- Modify: `development/service-account-access/accounts/services/identity_login_method_service.py`
- Modify: `development/service-account-access/accounts/services/identity_lifecycle_service.py`
- Modify: `development/service-account-access/accounts/views.py`

- [ ] manager setup 완료 시 projection sync를 호출한다.
- [ ] password 변경 시 projection sync를 호출한다.
- [ ] login method 추가/삭제, identity archive/recovery 시 projection sync를 호출한다.
- [ ] legacy `/register/`는 public signup 차단 응답으로 바꾼다.

### Task 5: verification 및 문서 refresh

**Files:**
- Modify: `development/service-account-access/openapi.json` or generated output if refreshed by script

- [ ] `accounts.tests` 전체를 실행한다.
- [ ] `python manage.py makemigrations --check --dry-run`을 실행한다.
- [ ] `refresh_api_docs.py --service service-account-access`를 실행한다.
- [ ] `git diff --check`로 마무리 검증한다.
