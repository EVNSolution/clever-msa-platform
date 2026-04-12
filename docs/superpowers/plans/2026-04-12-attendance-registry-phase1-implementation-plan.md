# Attendance Registry Phase 1 Implementation Plan

> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-attendance-registry`를 새 daily attendance truth owner로 도입하고, 배차 확정에서 생성된 근태 truth가 delivery snapshot과 월정산 제외 규칙까지 일관되게 이어지도록 만든다.

**Architecture:** 플랫폼 root docs를 먼저 고정한 뒤, 새 image-backed Django service `service-attendance-registry`를 linked child repo로 추가한다. phase 1의 active producer는 `service-dispatch-registry` 하나만 두고, 배차 확정 결과를 attendance-derived signal로 발행한다. `service-attendance-registry`는 `기사 x 일자` daily truth만 소유하고, `service-delivery-record`와 `service-settlement-payroll`은 그 final status를 읽어 각자 exclusion rule을 적용한다. 배포는 build-only service repo + central deploy repo 원칙을 따르되, gateway route 반영은 현재 source-deploy 예외 경로를 명시적으로 유지한다.

**Tech Stack:** Django REST Framework, Django ORM, drf-spectacular, Docker, GitHub Actions, integration-local-stack Compose, Nginx gateway, central deploy catalog/runbooks

---

## Scope Check

이 plan은 여러 repo를 건드리지만 하나의 vertical slice다.

- attendance truth 정본 service 추가
- dispatch derived attendance ingest
- delivery snapshot / settlement payroll exclusion gate
- local stack / API docs / deploy-control 준비

이번 plan에 포함하지 않는 것:

- front-web-console 명시 근태 CRUD 화면
- `service-attendance-operations-view`
- driver app calendar / attendance UI cutover
- explicit source producer 구현
- forecast source producer 구현

즉 phase 1은 `dispatch -> attendance day truth -> settlement exclusion` path만 먼저 닫고, explicit/forecast producer와 관련 UI는 다음 slice로 남긴다.

## File Map

### Root Docs

- Add: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-12-attendance-registry-daily-truth-design.md`
- Add: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-12-attendance-registry-phase1-implementation-plan.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.gitmodules`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/repo-responsibility-matrix.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts/04-driver-360-read-model.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/12-settlement-phase-2-api-gates.md`

### `development/service-attendance-registry`

- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/.env.example`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/.github/workflows/build-image.yml`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/Dockerfile`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/README.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/entrypoint.sh`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/manage.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/requirements.txt`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/config/__init__.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/config/asgi.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/config/settings.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/config/urls.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/config/wsgi.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/__init__.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/apps.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/authentication.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/exceptions.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/models.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/permissions.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/permissions_navigation.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/serializers.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/urls.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/views.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/services/__init__.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/services/attendance_resolution_service.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/management/commands/seed_attendance_registry.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/migrations/0001_initial.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/tests/test_attendance_api.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/tests/test_attendance_resolution_service.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/tests/test_health_api.py`

### `development/service-dispatch-registry`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/services/source_clients.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/services/dispatch_upload_service.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/tests/test_dispatch_upload_api.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/tests/test_source_clients.py`

### `development/service-delivery-record`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/services/source_clients.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/tests/test_source_clients.py`

### `development/service-settlement-payroll`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/settlements/services/source_clients.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/settlements/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/settlements/tests/test_settlement_api.py`

### `development/integration-local-stack`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/docker-compose.deploy.account-driver-settlement.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/compose/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/compose/dev-gateway.nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/compose/local-startup-manifest.json`
- Add: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/infra/env/local/attendance-registry.env.example`
- Add: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/infra/env/deploy/attendance-registry.env.example`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/infra/env/local/dispatch-registry.env.example`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/infra/env/local/delivery-record.env.example`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/infra/env/local/settlement-payroll.env.example`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/infra/env/deploy/dispatch-registry.env.example`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/infra/env/deploy/delivery-record.env.example`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/infra/env/deploy/settlement-payroll.env.example`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/infra/env/local/deploy-images.env.example`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/infra/env/deploy/deploy-images.env.example`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/scripts/build_unified_openapi.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/compose/api-docs/README.md`
- Add: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/compose/api-docs/service-schemas/service-attendance-registry.openapi.yaml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/compose/api-docs/clever-unified.openapi.yaml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.github/workflows/refresh-api-docs.yml`

### `development/edge-api-gateway`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/nginx.conf`

### `../clever-deploy-control`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/catalog/services.yaml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/inventory/current-runtime-deploy-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/image-deploy-pilot.md`

## Task 0: Preflight And Boundary Freeze

**Files:**
- Read only: docs and file map above

- [ ] **Step 1: 현재 경계와 deploy drift를 기록한다**

Run:

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform status --short
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control status --short
```

Expected:
- root와 central deploy repo에 기존 dirty change가 있을 수 있다
- 이 작업에서는 attendance service 관련 변경만 건드린다

- [ ] **Step 2: 현재 attendance truth 부재와 deploy policy 드리프트를 다시 확인한다**

확인 포인트:
- attendance truth는 아직 `/api/schedule/*` 분해 잔여물이다
- payroll은 delivery history를 임시 attendance signal로만 본다
- central deploy policy는 image build 중심인데, deploy inventory 문구는 아직 source-deploy 흔적이 남아 있다

- [ ] **Step 3: release bundle 범위를 고정한다**

이번 cycle release candidate 기본 묶음:
- `service-attendance-registry`
- `service-dispatch-registry`
- `service-delivery-record`
- `service-settlement-payroll`

예외:
- `edge-api-gateway`는 route 변경이 필요하지만 현재 `build-image.yml`이 없으므로 source-deploy exception으로 취급한다

## Task 1: Docs Of Truth And Planned Target Registration

**Files:**
- Add: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-12-attendance-registry-daily-truth-design.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/repo-responsibility-matrix.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts/04-driver-360-read-model.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/12-settlement-phase-2-api-gates.md`

- [ ] **Step 1: attendance service boundary spec를 추가한다**

문서에 아래를 고정한다.
- `service-attendance-registry`는 `기사 x 일자` daily truth만 소유
- phase 1 active source는 dispatch 하나만 둔다
- explicit / forecast source는 future extension으로만 문서화한다
- `00`은 payroll rule이 아니라 dispatch-derived attendance signal 해석 규칙
- settlement는 attendance truth consumer이며 owner가 아님

- [ ] **Step 2: repo map과 responsibility matrix에 새 service를 추가한다**

반영 내용:
- repo name: `service-attendance-registry`
- category: `service`
- compose service: `attendance-registry-api`
- gateway prefix: `/api/attendance/`
- owns: attendance day truth, dispatch-derived signal resolution
- does not own: delivery raw record, settlement result, dispatch plan truth

- [ ] **Step 3: driver/settlement docs의 임시 attendance wording을 교체한다**

반영 내용:
- `delivery_history_present -> attendance_inferred_from_delivery_history` 임시 rule을 deprecated로 명시
- 새 source of truth는 attendance registry라고 고정

- [ ] **Step 4: 문서 diff를 검토한다**

Expected:
- root docs만 봐도 attendance와 settlement의 경계가 분명하다
- `service-attendance-registry`가 settlement 4축을 다시 합치지 않는다는 점이 명시된다

## Task 2: Create The Remote Repo, Linked Child Repo, And Service Skeleton

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.gitmodules`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/*`

- [ ] **Step 1: remote GitHub repo 선행조건을 만든다**

Run:

```bash
gh repo create EVNSolution/service-attendance-registry --private --clone=false --description "CLEVER MSA attendance daily truth owner"
```

Expected:
- GitHub에 `EVNSolution/service-attendance-registry`가 생성된다
- main branch와 repo permissions가 준비된다

- [ ] **Step 2: linked child entry를 만든다**

Run:

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform submodule add https://github.com/EVNSolution/service-attendance-registry development/service-attendance-registry
```

Expected:
- `.gitmodules`에 attendance repo entry가 생긴다
- `development/service-attendance-registry`가 독립 git repo로 노출된다

- [ ] **Step 3: Django service skeleton을 기존 registry 패턴으로 맞춘다**

생성 기준:
- `manage.py`, `config/*`, `attendanceregistry/*`, `Dockerfile`, `entrypoint.sh`, `requirements.txt`
- repo-local `AGENTS.md`는 만들지 않는다
- health endpoint와 JWT/auth middleware 구조는 기존 Django service 패턴을 따른다

- [ ] **Step 4: build-image workflow와 README를 넣는다**

기준:
- workflow filename은 `.github/workflows/build-image.yml`
- ECR repository name은 `service-attendance-registry`
- README에는 local run, test, env, owned boundary만 적는다

- [ ] **Step 5: skeleton smoke를 확인한다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry
python3 manage.py check
python3 manage.py test attendanceregistry.tests.test_health_api -v 2
```

Expected:
- settings import PASS
- health test PASS

## Task 3: Implement Attendance Truth Core

**Files:**
- Modify/Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/models.py`
- Modify/Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/serializers.py`
- Modify/Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/views.py`
- Modify/Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/urls.py`
- Modify/Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/services/attendance_resolution_service.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/migrations/0001_initial.py`
- Modify/Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/tests/test_attendance_api.py`
- Modify/Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/attendanceregistry/tests/test_attendance_resolution_service.py`

- [ ] **Step 1: failing tests로 dispatch-derived truth를 먼저 고정한다**

최소 테스트 세트:
- `00` dispatch row는 `day_off` candidate로 해석된다
- 일반 배차 row는 `worked`로 해석된다
- 같은 날짜에 dispatch signal을 다시 넣으면 idempotent update가 된다
- `day_off`와 `exception`은 final status로 남는다

- [ ] **Step 2: `AttendanceDay`와 `AttendanceSignal` 모델을 만든다**

최소 필드:

```python
AttendanceDay(
    attendance_day_id,
    driver_id,
    attendance_date,
    final_status,
    decided_source_kind,
    decided_signal_id,
)

AttendanceSignal(
    attendance_signal_id,
    driver_id,
    attendance_date,
    source_kind,
    suggested_status,
    raw_reason_code,
    raw_payload,
    source_reference,
)
```

- [ ] **Step 3: resolution service를 구현한다**

규칙:
- dispatch `00` + zero workload는 `day_off`
- dispatch row라도 `needs_review` 조건이면 final status `exception`
- phase 1은 `source_kind=dispatch`만 활성화한다

- [ ] **Step 4: public/internal API를 구현한다**

필수 endpoints:
- `GET /api/attendance/days/`
- `GET /api/attendance/days/{attendance_day_id}/`
- `POST /api/attendance/internal/dispatch-signals:sync/`
- `POST /api/attendance/internal/days:bulk-lookup/`

- [ ] **Step 5: core tests를 GREEN으로 만든다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry
python3 manage.py test attendanceregistry.tests.test_attendance_resolution_service attendanceregistry.tests.test_attendance_api -v 2
```

Expected:
- dispatch-derived resolution test PASS
- bulk lookup PASS

## Task 4: Publish Dispatch-Derived Attendance Signals On Confirm

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/services/source_clients.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/services/dispatch_upload_service.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/tests/test_dispatch_upload_api.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/tests/test_source_clients.py`

- [ ] **Step 1: attendance sync client failing test를 쓴다**

검증 내용:
- confirm 시 attendance sync HTTP call이 1회 실행된다
- 재시도 가능한 upstream error는 502/503로 surface 된다
- 같은 batch 재확정은 idempotent payload를 보낸다

- [ ] **Step 2: dispatch row -> attendance signal 매핑을 구현한다**

필수 payload 규칙:
- `driver_id`
- `dispatch_date`
- `source_kind=dispatch`
- `source_reference=dispatch_upload_batch_id`
- raw scope fields 포함
- `small_region_text == "00"`이면 `suggested_status=day_off`
- 그 외 matched driver row는 `suggested_status=worked` 기본값

- [ ] **Step 3: confirm path에 attendance sync를 연결한다**

순서:
1. current sheet revalidate
2. confirm upload batch
3. sync dispatch-derived attendance
4. delivery-record bootstrap 호출

주의:
- attendance sync failure면 bootstrap으로 넘어가지 않는다
- upload confirm과 attendance sync 사이를 조용히 삼키지 않는다

- [ ] **Step 4: dispatch upload API regression을 돌린다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry
python3 manage.py test dispatch.tests.test_dispatch_upload_api dispatch.tests.test_source_clients -v 2
```

Expected:
- confirm endpoint가 attendance sync를 요구하는 새 contract로 PASS

## Task 5: Gate Delivery Snapshot Bootstrap And Payroll By Attendance Truth

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/services/source_clients.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/tests/test_source_clients.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/settlements/services/source_clients.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/settlements/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/settlements/tests/test_settlement_api.py`

- [ ] **Step 1: delivery bootstrap exclusion failing test를 추가한다**

테스트 기대:
- `final_status=day_off` 일자는 daily snapshot을 만들지 않는다
- `final_status=exception`은 hard fail 또는 explicit skip reason으로 남긴다
- attendance service unavailable이면 bootstrap 전체를 실패시킨다

- [ ] **Step 2: delivery-record source client에 attendance day bulk lookup을 추가한다**

요청 단위:
- confirm batch에서 생성 예정인 `driver_id + attendance_date` 묶음
- response로 `final_status`, `attendance_day_id` 수신

- [ ] **Step 3: payroll run failing test를 추가한다**

테스트 기대:
- `final_status=worked` day만 amount 집계
- `day_off`는 amount에 안 들어간다
- `0.00` excluded snapshot 때문에 item이 생기지 않는다

- [ ] **Step 4: payroll aggregation에 attendance gate를 넣는다**

규칙:
- dispatch overtime surcharge 로직은 유지
- attendance는 daily truth만 제공하고, payroll이 `final_status` 기준 inclusion gate를 적용한다
- attendance unavailable이면 settlement run을 실패로 돌리고 조용한 fallback을 두지 않는다

- [ ] **Step 5: delivery/payroll regression을 돌린다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record
python3 manage.py test deliveryrecords.tests.test_delivery_record_api deliveryrecords.tests.test_source_clients -v 2

cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll
python3 manage.py test settlements.tests.test_settlement_api -v 2
```

Expected:
- `00`/day_off row exclusion test PASS
- payroll이 attendance truth를 읽고 exclude하는 test PASS

## Task 6: Wire Local Stack, Gateway, And API Docs

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/docker-compose.deploy.account-driver-settlement.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/compose/dev-gateway.nginx.conf`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/edge-api-gateway/nginx.conf`
- Modify/Add env files and API docs files from file map above

- [ ] **Step 1: compose와 env template에 attendance service를 추가한다**

반영 내용:
- local/deploy compose에 `attendance-registry-api` service block 추가
- `dispatch-registry-api`, `delivery-record-api`, `settlement-payroll-api`가 `ATTENDANCE_REGISTRY_BASE_URL`을 받게 함
- `deploy-images.env.example`에 `ATTENDANCE_REGISTRY_IMAGE` 추가

- [ ] **Step 2: gateway route를 추가한다**

반영 내용:
- `/api/attendance/` -> `attendance-registry-api:8000`
- local dev gateway와 edge gateway를 둘 다 갱신

- [ ] **Step 3: local startup manifest와 README를 갱신한다**

Expected:
- 새 service가 local startup inventory에 등장
- compose/README와 stack README가 route, compose service, env file을 설명

- [ ] **Step 4: API docs refresh 대상에 attendance service를 추가한다**

반영 내용:
- `build_unified_openapi.py` `SCHEMA_ENABLED_SERVICES`에 `service-attendance-registry` 추가
- `refresh-api-docs.yml` linked child repo/requirements install 목록에 attendance repo 추가
- `python manage.py spectacular` export가 성공하도록 settings/env를 맞춤

- [ ] **Step 5: API docs strict refresh를 확인한다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform
python3 ./development/integration-local-stack/scripts/refresh_api_docs.py --strict
```

Expected:
- `service-attendance-registry.openapi.yaml` 생성
- `clever-unified.openapi.yaml`에 `/api/attendance/` path가 보인다

## Task 7: Prepare Image Build And Central Deploy Control

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/.github/workflows/build-image.yml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/catalog/services.yaml`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/inventory/current-runtime-deploy-inventory.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/docs/runbooks/image-deploy-pilot.md`

- [ ] **Step 1: 새 service image build workflow를 고정한다**

기준:
- workflow name은 `Build service-attendance-registry image`
- `ECR_REPOSITORY=service-attendance-registry`
- role session name, image uri, tag format은 기존 build-image.yml 패턴과 동일

- [ ] **Step 2: central deploy catalog에 attendance service를 추가한다**

반영 내용:
- `service_id: service-attendance-registry`
- `compose_service: attendance-registry-api`
- `image_repository: service-attendance-registry`
- attendance를 dispatch/delivery/payroll보다 먼저 배치
- dependent services의 `depends_on`에 attendance service를 추가할지 검토하고, 필요하면 catalog에 반영

- [ ] **Step 3: deploy inventory와 runbook wording을 image-first로 맞춘다**

주의:
- attendance service는 source:git 문구를 복사하지 않는다
- current pilot/runbook wording과 충돌하면 attendance service 쪽은 image-backed 정합성 기준으로 적는다
- gateway route rollout은 source-deploy exception으로 분리 서술한다

- [ ] **Step 4: central deploy dry-read를 검토한다**

Run:

```bash
python3 /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/scripts/deploy/compute-targets.py --catalog /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/clever-deploy-control/catalog/services.yaml --targets service-attendance-registry,service-dispatch-registry,service-delivery-record,service-settlement-payroll
```

Expected:
- attendance service가 deploy target으로 해석된다
- release bundle target list가 깨지지 않는다

## Task 8: Focused Verification And Release Handoff

**Files:**
- Read only: changed repos and generated docs

- [ ] **Step 1: backend focused suite를 순서대로 실행한다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry && python3 manage.py test -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry && python3 manage.py test dispatch.tests.test_dispatch_upload_api dispatch.tests.test_source_clients -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record && python3 manage.py test deliveryrecords.tests.test_delivery_record_api deliveryrecords.tests.test_source_clients -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll && python3 manage.py test settlements.tests.test_settlement_api -v 2
```

Expected:
- attendance precedence, dispatch sync, bootstrap exclusion, payroll exclusion 모두 PASS

- [ ] **Step 2: integrated local stack smoke를 실행한다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack
docker compose -f docker-compose.account-driver-settlement.yml up -d attendance-registry-api dispatch-registry-api delivery-record-api settlement-payroll-api gateway
```

Smoke:
- `GET http://localhost:8080/api/attendance/days/`
- dispatch confirm -> attendance sync -> delivery bootstrap
- settlement run -> excluded day 미집계

- [ ] **Step 3: image build evidence와 release bundle을 정리한다**

필수 evidence:
- `service-attendance-registry` build-image workflow success
- changed service repo image tags
- API docs refresh success

central deploy bundle 기본값:
- `service-attendance-registry`
- `service-dispatch-registry`
- `service-delivery-record`
- `service-settlement-payroll`

예외 rollout:
- `edge-api-gateway` route 반영은 source-deploy exception으로 따로 호출

- [ ] **Step 4: deploy handoff 문구를 남긴다**

handoff에 반드시 적는다.
- attendance service가 truth owner라는 점
- gateway는 예외 경로라는 점
- `00` exclusion이 payroll hard rule이 아니라 attendance interpretation rule이라는 점
