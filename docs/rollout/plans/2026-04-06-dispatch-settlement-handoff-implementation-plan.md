# Dispatch to Settlement Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배차 보드의 내부 배송원 배정 결과를 `delivery-record`의 `draft daily input snapshot`으로 bootstrap 하고, 정산 입력/실행 화면이 이를 `draft -> active -> run` 흐름으로 읽게 만든다.

**Architecture:** `service-delivery-record`가 handoff write owner다. `service-dispatch-registry` truth를 읽어 내부 배송원 배정만 `draft snapshot`으로 upsert하고, `front-admin-console`은 배차 보드와 정산 입력 화면에서 이를 드러낸다. `settlement run` readiness는 계속 `active snapshot`만 기준으로 본다.

**Tech Stack:** Django REST Framework, Django model migrations/tests, React + TypeScript, existing admin console API clients/tests

---

### Task 1: Add draft snapshot status and current-row uniqueness

**Files:**
- Modify: `development/service-delivery-record/deliveryrecords/models.py`
- Modify: `development/service-delivery-record/deliveryrecords/serializers.py`
- Modify: `development/service-delivery-record/deliveryrecords/tests/test_models.py`
- Modify: `development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py`
- Create: `development/service-delivery-record/deliveryrecords/migrations/0002_*.py`

- [ ] **Step 1: Write failing model and API tests for `draft` snapshot behavior**

Add tests for:
- `DailyDeliveryInputSnapshot.Status.DRAFT`
- same `company + fleet + driver + service_date` allows one current row where `status in {draft, active}`
- `draft` can be created through API
- `settlement runs` readiness logic is unaffected because only UI counts `active`

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `python manage.py test deliveryrecords.tests.test_models deliveryrecords.tests.test_delivery_record_api -v 2`

Expected: FAIL because `draft` is not a valid status and uniqueness/current-row behavior is missing.

- [ ] **Step 3: Implement minimal model and serializer changes**

Change `DailyDeliveryInputSnapshot.Status` to:
- `DRAFT`
- `ACTIVE`
- `SUPERSEDED`

Update uniqueness constraint so only one current row with status `draft` or `active` exists per `company + fleet + driver + service_date`.

- [ ] **Step 4: Run targeted tests to verify green**

Run: `python manage.py test deliveryrecords.tests.test_models deliveryrecords.tests.test_delivery_record_api -v 2`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/service-delivery-record/deliveryrecords/models.py \
  development/service-delivery-record/deliveryrecords/serializers.py \
  development/service-delivery-record/deliveryrecords/tests/test_models.py \
  development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py \
  development/service-delivery-record/deliveryrecords/migrations/
git commit -m "feat: add draft delivery input snapshots"
```

### Task 2: Add dispatch bootstrap handoff endpoint in delivery-record

**Files:**
- Create: `development/service-delivery-record/deliveryrecords/services/dispatch_handoff_service.py`
- Create: `development/service-delivery-record/deliveryrecords/services/dispatch_source_client.py`
- Modify: `development/service-delivery-record/deliveryrecords/views.py`
- Modify: `development/service-delivery-record/deliveryrecords/urls.py`
- Modify: `development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py`
- Modify: `development/service-delivery-record/deliveryrecords/tests/test_source_clients.py`

- [ ] **Step 1: Write failing API tests for bootstrap handoff**

Add tests for:
- `POST /daily-snapshots/bootstrap-from-dispatch/`
- creates `draft` snapshots for assigned internal drivers only
- skips existing current `draft/active` snapshots
- ignores outsourced assignments
- returns `{ created_count, skipped_count, created_snapshot_ids }`

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `python manage.py test deliveryrecords.tests.test_delivery_record_api -v 2`

Expected: FAIL because endpoint and source client do not exist.

- [ ] **Step 3: Implement dispatch source client and handoff service**

Read from `service-dispatch-registry` truth endpoints:
- schedules by `fleet_id + dispatch_date`
- assignments by `dispatch_date + assignment_status=assigned`

Filter to schedule ids in the selected fleet/date and rows with non-null `driver_id`.

For each internal driver row, `get_or_create` current `draft` snapshot with zeroed numeric values.

- [ ] **Step 4: Add endpoint wiring**

Expose:
- `POST /daily-snapshots/bootstrap-from-dispatch/`

Body:
- `company_id`
- `fleet_id`
- `service_date`

- [ ] **Step 5: Run targeted tests to verify green**

Run: `python manage.py test deliveryrecords.tests.test_delivery_record_api deliveryrecords.tests.test_source_clients -v 2`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add development/service-delivery-record/deliveryrecords/services/dispatch_handoff_service.py \
  development/service-delivery-record/deliveryrecords/services/dispatch_source_client.py \
  development/service-delivery-record/deliveryrecords/views.py \
  development/service-delivery-record/deliveryrecords/urls.py \
  development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py \
  development/service-delivery-record/deliveryrecords/tests/test_source_clients.py
git commit -m "feat: add dispatch bootstrap handoff for daily snapshots"
```

### Task 3: Surface draft snapshots in settlement input and readiness

**Files:**
- Modify: `development/front-admin-console/src/api/deliveryRecords.ts`
- Modify: `development/front-admin-console/src/pages/SettlementInputsPage.tsx`
- Modify: `development/front-admin-console/src/pages/SettlementRunsPage.tsx`
- Modify: `development/front-admin-console/src/uiLabels.ts`
- Modify: `development/front-admin-console/src/pages/SettlementInputsPage.test.tsx`
- Modify: `development/front-admin-console/src/pages/SettlementRunsPage.test.tsx`

- [ ] **Step 1: Write failing UI tests for draft snapshot visibility**

Add tests for:
- `SettlementInputsPage` shows `draft snapshot` count separately
- snapshot status selector includes `draft`
- `SettlementRunsPage` readiness still counts only `active`

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `npm test -- --run src/pages/SettlementInputsPage.test.tsx src/pages/SettlementRunsPage.test.tsx`

Expected: FAIL because draft status is not rendered.

- [ ] **Step 3: Implement minimal UI changes**

Update labels and summaries:
- draft snapshot metric
- active snapshot metric
- readiness note still `active` only

Keep manual create/edit as exception path.

- [ ] **Step 4: Run targeted tests to verify green**

Run: `npm test -- --run src/pages/SettlementInputsPage.test.tsx src/pages/SettlementRunsPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add development/front-admin-console/src/api/deliveryRecords.ts \
  development/front-admin-console/src/pages/SettlementInputsPage.tsx \
  development/front-admin-console/src/pages/SettlementRunsPage.tsx \
  development/front-admin-console/src/uiLabels.ts \
  development/front-admin-console/src/pages/SettlementInputsPage.test.tsx \
  development/front-admin-console/src/pages/SettlementRunsPage.test.tsx
git commit -m "feat: surface draft settlement input snapshots"
```

### Task 4: Trigger handoff from dispatch board and document the boundary

**Files:**
- Modify: `development/front-admin-console/src/api/deliveryRecords.ts`
- Modify: `development/front-admin-console/src/pages/DispatchBoardDetailPage.tsx`
- Modify: `development/front-admin-console/src/pages/DispatchBoardDetailPage.test.tsx`
- Modify: `docs/contracts/14-settlement-upload-first-ux-flow.md`
- Modify: `docs/contracts/16-admin-dispatch-board-pages.md`
- Modify: `docs/decisions/specs/2026-04-06-dispatch-settlement-handoff-design.md`

- [ ] **Step 1: Write failing UI test for dispatch handoff CTA**

Add a test that:
- shows `정산 입력으로 넘기기`
- posts `company_id + fleet_id + service_date`
- reloads snapshot/handoff state after success

- [ ] **Step 2: Run targeted test to verify it fails**

Run: `npm test -- --run src/pages/DispatchBoardDetailPage.test.tsx`

Expected: FAIL because CTA and API call do not exist.

- [ ] **Step 3: Implement dispatch board CTA**

Use new API helper:
- `bootstrapDailySnapshotsFromDispatch`

Show success/error feedback in existing board context and keep link to settlement inputs.

- [ ] **Step 4: Update docs to match shipped behavior**

Document:
- internal-driver-only handoff
- outsourced remains deferred
- draft snapshots are the bootstrap output
- active snapshots remain readiness boundary

- [ ] **Step 5: Run targeted test to verify green**

Run: `npm test -- --run src/pages/DispatchBoardDetailPage.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add development/front-admin-console/src/api/deliveryRecords.ts \
  development/front-admin-console/src/pages/DispatchBoardDetailPage.tsx \
  development/front-admin-console/src/pages/DispatchBoardDetailPage.test.tsx \
  docs/contracts/14-settlement-upload-first-ux-flow.md \
  docs/contracts/16-admin-dispatch-board-pages.md \
  docs/decisions/specs/2026-04-06-dispatch-settlement-handoff-design.md
git commit -m "feat: trigger settlement input bootstrap from dispatch board"
```

### Task 5: Full verification

**Files:**
- Modify: none unless fixes are needed

- [ ] **Step 1: Run backend delivery-record suite**

Run: `python manage.py test deliveryrecords.tests -v 2`

Expected: PASS

- [ ] **Step 2: Run frontend targeted settlement and dispatch tests**

Run: `npm test -- --run src/pages/SettlementInputsPage.test.tsx src/pages/SettlementRunsPage.test.tsx src/pages/DispatchBoardDetailPage.test.tsx`

Expected: PASS

- [ ] **Step 3: Run full admin console suite and build**

Run: `npm test -- --run && npm run build`

Expected: PASS

- [ ] **Step 4: Run docs and migration checks**

Run:
- `python manage.py makemigrations --check --dry-run`
- `git diff --check`

Expected: PASS

- [ ] **Step 5: Commit final verification fixes if needed**

```bash
git add -A
git commit -m "test: verify dispatch settlement handoff flow"
```
