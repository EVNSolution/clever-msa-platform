# Vehicle Ops Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 bootstrap 위에 `Vehicle Ops Phase 1` query service를 추가하고, `front /vehicles`가 `Vehicle Asset`과 `Organization Master`를 직접 조합하지 않고 하나의 summary contract로 차량 목록과 상세를 조회하게 만든다.

**Architecture:** 이번 1차는 projection DB를 두지 않고, `vehicle-ops` 전용 Django/DRF query service가 사용자 Bearer token을 전달받아 `Vehicle Asset`과 `Organization Master`를 bounded fan-out으로 조회한 뒤 화면용 summary payload를 조합한다. `admin-front`는 계속 `Vehicle Asset` 정본 API를 사용하고, `front`만 `Vehicle Ops` contract로 전환한다.

**Tech Stack:** Django/DRF, React/Vite, Docker Compose, Nginx, HTTP query aggregation, existing JWT auth pattern

---

### Task 1: Freeze Vehicle Ops Phase 1 Documents

**Files:**
- Modify: `goal/05-vehicle-ops-read-model.md`
- Modify: `goal/09-integration-rules.md`
- Modify: `README.md`
- Modify: `compose/README.md`
- Reference: `docs/superpowers/specs/2026-03-20-vehicle-ops-phase-1-design.md`

- [ ] **Step 1: `goal/05`를 1차와 후속 확장으로 분리해 문맥을 고정**

아래를 명시한다.

- bootstrap 1차는 `Vehicle Asset + Organization Master`만 사용
- `Terminal Ops`, `Workforce Schedule Match`, `Telemetry Hub`는 later-phase dependency
- `current_driver`, `terminal`, `handover`, `telemetry`, `maintenance`, `accident`는 future field

- [ ] **Step 2: `goal/09`에 bootstrap 예외를 추가**

다음을 반영한다.

- 장기적으로 `Vehicle Ops`는 projection 우선
- bootstrap 1차는 bounded fan-out query service 허용
- 허용 source는 `Vehicle Asset`, `Organization Master` 두 개로 제한
- `front`는 source API를 직접 fan-out하지 않고 `Vehicle Ops` contract만 사용

- [ ] **Step 3: README 계열 문서의 현재 상태를 갱신**

`README.md`, `compose/README.md`에 아래를 반영한다.

- `Vehicle Ops Phase 1`이 다음 구현 대상
- `front /vehicles`는 `Vehicle Ops` query service로 전환 예정
- `admin-front`의 차량 write 경로는 계속 `Vehicle Asset` 정본 API를 사용

- [ ] **Step 4: 문서 정합성 확인**

Run: `rg -n "current_driver|terminal_status|handover|telemetry|maintenance_flag|accident_flag|front.*fan-out" goal/05-vehicle-ops-read-model.md goal/09-integration-rules.md README.md compose/README.md`

Expected:
- 남아 있더라도 future dependency 또는 금지 규칙 문맥으로만 존재

- [ ] **Step 5: Ready-to-Commit File List 기록**

- `goal/05-vehicle-ops-read-model.md`
- `goal/09-integration-rules.md`
- `README.md`
- `compose/README.md`

### Task 2: Scaffold the Vehicle Ops Query Service

**Files:**
- Create: `services/vehicle-ops/Dockerfile`
- Create: `services/vehicle-ops/entrypoint.sh`
- Create: `services/vehicle-ops/manage.py`
- Create: `services/vehicle-ops/requirements.txt`
- Create: `services/vehicle-ops/config/__init__.py`
- Create: `services/vehicle-ops/config/asgi.py`
- Create: `services/vehicle-ops/config/settings.py`
- Create: `services/vehicle-ops/config/urls.py`
- Create: `services/vehicle-ops/config/wsgi.py`
- Create: `services/vehicle-ops/vehicleops/__init__.py`
- Create: `services/vehicle-ops/vehicleops/apps.py`
- Create: `services/vehicle-ops/vehicleops/authentication.py`
- Create: `services/vehicle-ops/vehicleops/exceptions.py`
- Create: `services/vehicle-ops/vehicleops/permissions.py`
- Create: `services/vehicle-ops/vehicleops/serializers.py`
- Create: `services/vehicle-ops/vehicleops/urls.py`
- Create: `services/vehicle-ops/vehicleops/views.py`
- Create: `services/vehicle-ops/vehicleops/tests/__init__.py`
- Test: `services/vehicle-ops/vehicleops/tests/test_vehicle_ops_api.py`

- [ ] **Step 1: health/list/detail endpoint 테스트를 먼저 쓴다**

`test_vehicle_ops_api.py`에 최소 케이스를 만든다.

- `GET /health/` returns `{"status": "ok"}`
- unauthenticated list returns `401`
- authenticated list returns summary array
- authenticated detail returns summary contract

- [ ] **Step 2: `driver-360` 패턴을 따라 Django/DRF skeleton을 만든다**

아래 원칙을 맞춘다.

- sqlite default DB
- JWT auth
- 공통 error envelope
- read-only permission
- health endpoint

- [ ] **Step 3: API route를 아래로 고정**

- `GET /health/`
- `GET /vehicles/`
- `GET /vehicles/<uuid:vehicle_id>/`

- [ ] **Step 4: service-local 테스트 실행**

Run: `cd services/vehicle-ops && python manage.py test vehicleops.tests.test_vehicle_ops_api -v 2`

Expected:
- health/list/detail skeleton tests pass

- [ ] **Step 5: Ready-to-Commit File List 기록**

- `services/vehicle-ops/Dockerfile`
- `services/vehicle-ops/entrypoint.sh`
- `services/vehicle-ops/manage.py`
- `services/vehicle-ops/requirements.txt`
- `services/vehicle-ops/config/__init__.py`
- `services/vehicle-ops/config/asgi.py`
- `services/vehicle-ops/config/settings.py`
- `services/vehicle-ops/config/urls.py`
- `services/vehicle-ops/config/wsgi.py`
- `services/vehicle-ops/vehicleops/__init__.py`
- `services/vehicle-ops/vehicleops/apps.py`
- `services/vehicle-ops/vehicleops/authentication.py`
- `services/vehicle-ops/vehicleops/exceptions.py`
- `services/vehicle-ops/vehicleops/permissions.py`
- `services/vehicle-ops/vehicleops/serializers.py`
- `services/vehicle-ops/vehicleops/urls.py`
- `services/vehicle-ops/vehicleops/views.py`
- `services/vehicle-ops/vehicleops/tests/__init__.py`
- `services/vehicle-ops/vehicleops/tests/test_vehicle_ops_api.py`

### Task 3: Implement Vehicle Summary Aggregation

**Files:**
- Create: `services/vehicle-ops/vehicleops/services/__init__.py`
- Create: `services/vehicle-ops/vehicleops/services/source_clients.py`
- Create: `services/vehicle-ops/vehicleops/services/vehicle_summary_service.py`
- Modify: `services/vehicle-ops/config/settings.py`
- Modify: `services/vehicle-ops/vehicleops/serializers.py`
- Modify: `services/vehicle-ops/vehicleops/views.py`
- Test: `services/vehicle-ops/vehicleops/tests/test_vehicle_summary_service.py`
- Modify: `services/vehicle-ops/vehicleops/tests/test_vehicle_ops_api.py`

- [ ] **Step 1: summary contract 테스트를 먼저 쓴다**

`test_vehicle_summary_service.py`에 아래 케이스를 작성한다.

- company와 fleet 이름이 모두 있는 summary
- `fleet_id = null`인 summary
- company 또는 fleet 이름 lookup 실패 시 `warnings` 반환
- vehicle가 없으면 `404`

- [ ] **Step 2: source client를 분리한다**

`source_clients.py`에 아래 호출을 캡슐화한다.

- vehicle-asset: `GET /vehicles/`, `GET /vehicles/<vehicle_id>/`
- organization-master: `GET /companies/`, `GET /fleets/`

모든 upstream 호출은 원요청의 `Authorization` header를 forward한다.

- [ ] **Step 3: summary 조립 규칙을 구현한다**

`vehicle_summary_service.py`는 아래 규칙으로 응답을 만든다.

- `vehicle_id`, `plate_number`, `vin`, `vehicle_status`는 `Vehicle Asset` 정본 그대로 유지
- `company_id`, `fleet_id`도 source 식별자를 유지
- `company_name`, `fleet_name`은 `Organization Master` 요약으로 채운다
- 이름 lookup 실패는 `warnings`로만 표현하고 summary는 유지한다

- [ ] **Step 4: API view를 service 기반으로 얇게 만든다**

`views.py`는 serializer validation과 HTTP status mapping만 맡고, fan-out 및 조립 로직은 `vehicle_summary_service.py`에 둔다.

- [ ] **Step 5: service-local 테스트 실행**

Run: `cd services/vehicle-ops && python manage.py test vehicleops.tests -v 2`

Expected:
- summary service test 통과
- API test 통과

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `services/vehicle-ops/vehicleops/services/__init__.py`
- `services/vehicle-ops/vehicleops/services/source_clients.py`
- `services/vehicle-ops/vehicleops/services/vehicle_summary_service.py`
- `services/vehicle-ops/config/settings.py`
- `services/vehicle-ops/vehicleops/serializers.py`
- `services/vehicle-ops/vehicleops/views.py`
- `services/vehicle-ops/vehicleops/tests/test_vehicle_summary_service.py`
- `services/vehicle-ops/vehicleops/tests/test_vehicle_ops_api.py`

### Task 4: Wire Compose, Gateway, and Env

**Files:**
- Modify: `docker-compose.account-driver-settlement.yml`
- Modify: `gateway/nginx.conf`
- Create: `infra/env/vehicle-ops.env.example`
- Modify: `README.md`
- Modify: `compose/README.md`

- [ ] **Step 1: compose에 `vehicle-ops-api`를 추가한다**

아래 규칙으로 새 서비스를 추가한다.

- service name: `vehicle-ops-api`
- build context: `./services/vehicle-ops`
- env file: `./infra/env/vehicle-ops.env.example`
- depends_on: `vehicle-asset-api`, `organization-master-api`
- expose: `8000`

- [ ] **Step 2: gateway route를 연결한다**

최종 prefix는 아래로 고정한다.

- `/api/vehicle-ops/`

- [ ] **Step 3: env example에 최소 설정을 기록한다**

최소 env는 아래를 가진다.

- `API_PORT=8000`
- `JWT_SECRET_KEY`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `VEHICLE_ASSET_BASE_URL`
- `ORGANIZATION_MASTER_BASE_URL`

- [ ] **Step 4: compose와 gateway 문서를 현재 런타임 기준으로 갱신한다**

- `compose/README.md`에 새 서비스와 route 추가
- `README.md`에 `Vehicle Ops Phase 1`의 역할과 `front /vehicles` 전환 사실 기록

- [ ] **Step 5: 설정 정합성 확인**

Run: `docker compose -f docker-compose.account-driver-settlement.yml config`

Expected:
- exit code `0`

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `docker-compose.account-driver-settlement.yml`
- `gateway/nginx.conf`
- `infra/env/vehicle-ops.env.example`
- `README.md`
- `compose/README.md`

### Task 5: Switch Front Vehicles Screen to Vehicle Ops

**Files:**
- Create: `front/src/api/vehicleOps.ts`
- Modify: `front/src/pages/VehiclesPage.tsx`
- Modify: `front/src/pages/VehiclesPage.test.tsx`
- Modify: `front/src/types.ts`

- [ ] **Step 1: front contract 테스트를 먼저 바꾼다**

`VehiclesPage.test.tsx`에서 source contract를 `Vehicle Ops` summary 기준으로 바꾼다.

최소 검증:

- 목록에 `plate_number`, `company_name`, `fleet_name`, `vehicle_status` 표시
- detail에 동일 summary 정보 표시
- list/detail 실패 시 기존 error banner 유지

- [ ] **Step 2: `VehicleOpsSummary` 타입을 추가한다**

`front/src/types.ts`에 아래 타입을 추가한다.

- `vehicle_id`
- `plate_number`
- `vin`
- `vehicle_status`
- `company_id`
- `company_name`
- `fleet_id`
- `fleet_name`
- `warnings`

- [ ] **Step 3: 새 API client를 추가한다**

`front/src/api/vehicleOps.ts`에 아래 함수를 만든다.

- `listVehicleOps(client)`
- `getVehicleOps(client, vehicleId)`

최종 prefix는 `/vehicle-ops/vehicles/`를 사용한다.

- [ ] **Step 4: `VehiclesPage`를 `Vehicle Ops` contract로 전환한다**

아래 원칙을 지킨다.

- `company_name`, `fleet_name`을 우선 표시
- 원 식별자는 필요 시 detail에서만 보조로 노출
- `warnings`가 있으면 detail 영역에만 표시하거나 디버그성 문구로 제한

- [ ] **Step 5: front 테스트와 build 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run test -- --run /app/src/pages/VehiclesPage.test.tsx`

Expected:
- `VehiclesPage` test pass

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run build`

Expected:
- build pass

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `front/src/api/vehicleOps.ts`
- `front/src/pages/VehiclesPage.tsx`
- `front/src/pages/VehiclesPage.test.tsx`
- `front/src/types.ts`

### Task 6: End-to-End Verification

**Files:**
- Verify only: `services/vehicle-ops/**`
- Verify only: `front/src/pages/VehiclesPage.tsx`
- Verify only: `docker-compose.account-driver-settlement.yml`
- Verify only: `gateway/nginx.conf`

- [ ] **Step 1: query service tests 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm vehicle-ops-api python manage.py test vehicleops.tests -v 2`

Expected:
- all `vehicleops` tests pass

- [ ] **Step 2: front page tests와 build 재실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run test -- --run /app/src/pages/VehiclesPage.test.tsx`

Expected:
- test pass

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run build`

Expected:
- build pass

- [ ] **Step 3: runtime을 다시 띄운다**

Run: `docker compose -f docker-compose.account-driver-settlement.yml up --build -d gateway front admin-front vehicle-asset-api organization-master-api vehicle-ops-api`

Expected:
- containers running

- [ ] **Step 4: gateway smoke를 확인한다**

Run: `curl -s http://localhost:8080/api/vehicle-ops/health/`

Expected:
- `{"status":"ok"}`

Run:
- login 후 `GET /api/vehicle-ops/vehicles/`
- login 후 `GET /api/vehicle-ops/vehicles/50000000-0000-0000-0000-000000000001/`

Expected:
- summary에 `plate_number`, `company_name`, `fleet_name`, `vehicle_status` 존재
- `current_driver`, `terminal`, `handover`, `telemetry` 필드는 없음

- [ ] **Step 5: 브라우저 확인**

Playwright 또는 수동 확인:

- `/vehicles` 목록 로드
- `View Details` 클릭 시 summary detail 표시
- 회사/플릿 이름이 식별자 대신 화면 요약으로 보임

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `services/vehicle-ops/**`
- `front/src/api/vehicleOps.ts`
- `front/src/pages/VehiclesPage.tsx`
- `front/src/pages/VehiclesPage.test.tsx`
- `front/src/types.ts`
- `docker-compose.account-driver-settlement.yml`
- `gateway/nginx.conf`
- `infra/env/vehicle-ops.env.example`
- `README.md`
- `compose/README.md`
