# Support Reply Inbox Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 지원 답변 등록 시 사용자 inbox notification을 자동 생성하되, push 발송은 자동화하지 않는다.

**Architecture:** `service-support-registry`가 지원 응답 정본을 저장한 뒤 `service-notification-hub`에 HTTP handoff를 보낸다. 알림 생성은 best-effort side-effect로 처리하고, 지원 응답 저장은 notification 실패와 분리한다.

**Tech Stack:** Django REST Framework, service-to-service HTTP handoff, Django tests

---

### Task 1: Failing tests for support reply notification handoff

**Files:**
- Modify: `development/service-support-registry/supporttickets/tests/test_ticket_api.py`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- admin reply creates support response and triggers notification handoff
- ticket owner reply creates support response and does not trigger handoff
- notification handoff failure does not fail support response create

- [ ] **Step 2: Run test to verify it fails**

Run: `cd development/service-support-registry && python manage.py test supporttickets.tests.test_ticket_api.SupportTicketApiTests -v 2`
Expected: FAIL because no notification handoff exists yet

### Task 2: Implement support-to-notification handoff

**Files:**
- Create: `development/service-support-registry/supporttickets/services/notification_handoff_service.py`
- Modify: `development/service-support-registry/supporttickets/views.py`
- Modify: `development/service-support-registry/config/settings.py`

- [ ] **Step 1: Add a small handoff client**

Implement a helper that:
- builds a `POST /general/` request to notification-hub
- forwards the incoming `Authorization` header
- sends inbox-only payload for the ticket requester
- returns cleanly on network/application failure after logging

- [ ] **Step 2: Call it from admin reply create flow**

After `serializer.save(...)`, trigger handoff only when:
- reply author is admin
- requester is a different account

- [ ] **Step 3: Re-run tests**

Run: `cd development/service-support-registry && python manage.py test supporttickets.tests.test_ticket_api.SupportTicketApiTests -v 2`
Expected: PASS

### Task 3: Update docs and verify full service

**Files:**
- Modify: `docs/contracts/17-admin-communication-pages.md`
- Modify: `docs/decisions/specs/2026-03-26-support-registry-phase-1-activation-design.md`

- [ ] **Step 1: Document current truth**

State that support reply registration automatically creates inbox notification only, and push remains separate manual/notification-hub behavior.

- [ ] **Step 2: Run verification**

Run:
- `cd development/service-support-registry && python manage.py test -v 2`
- `cd development/service-support-registry && python manage.py makemigrations --check --dry-run`
- `python3 development/integration-local-stack/scripts/refresh_api_docs.py --service service-support-registry`
- `git diff --check`

Expected:
- tests pass
- no migrations needed
- OpenAPI refresh/verify pass
- diff check clean

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-04-05-support-reply-inbox-handoff.md \
  development/service-support-registry/supporttickets/tests/test_ticket_api.py \
  development/service-support-registry/supporttickets/services/notification_handoff_service.py \
  development/service-support-registry/supporttickets/views.py \
  development/service-support-registry/config/settings.py \
  docs/contracts/17-admin-communication-pages.md \
  docs/decisions/specs/2026-03-26-support-registry-phase-1-activation-design.md
git commit -m "feat: hand off support replies to inbox notifications"
```
