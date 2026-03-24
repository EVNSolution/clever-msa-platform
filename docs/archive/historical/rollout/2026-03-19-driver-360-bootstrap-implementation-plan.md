# Driver 360 Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 bootstrap의 4개 정본 서비스 위에 첫 번째 소비자 도메인인 `Driver 360` 읽기 서비스를 추가하고, front에서 기사 단건 운영 화면으로 조회할 수 있게 만든다.

**Architecture:** 이번 1차는 `projection DB + 이벤트 브로커`까지 가지 않고, `driver-360` 전용 Django/DRF query service가 사용자 Bearer token을 전달받아 기존 4개 정본 서비스를 bounded fan-out으로 조회한 뒤 하나의 summary payload로 합친다. 프런트는 더 이상 `계정 + 조직 + 기사 + 정산`을 직접 조합하지 않고 `driver-360` contract만 사용하며, 이후 materialized projection으로 바뀌어도 프런트 계약은 유지한다.

**Tech Stack:** Django/DRF, React/Vite, Docker Compose, Nginx, Postgres/Redis-backed source services, HTTP query aggregation

---

### Task 1: Freeze Driver 360 Bootstrap Scope

**Files:**
- Modify: `goal/04-driver-360-read-model.md`
- Modify: `goal/09-integration-rules.md`
- Modify: `reference/05-ev-dashboard-server-domain-extraction-notes.md`

- [ ] **Step 1: Driver 360 문서를 현재 bootstrap 필드 기준으로 재작성**

아래 필드만 `v1 summary`로 고정한다.

- `driver_id`
- `driver_name`
- `ev_id`
- `phone_number`
- `address`
- `company_id`
- `company_name`
- `fleet_id`
- `fleet_name`
- `account_id`
- `account_email`
- `account_role`
- `account_is_active`
- `latest_settlement_run_id`
- `latest_settlement_period_start`
- `latest_settlement_period_end`
- `latest_settlement_status`
- `latest_payout_status`
- `latest_settlement_amount`

- [ ] **Step 2: 아직 없는 소스 도메인은 future dependency로 내린다**

이번 1차에서 구현하지 않는 항목을 `future dependency`로 명시한다.

- `employment_status`
- `operational_status`
- `today_shift_status`
- `current_vehicle_id`
- `current_vehicle_status`
- `pending_approval_count`
- `latest_location_at`

- [ ] **Step 3: integration rules에 bootstrap 예외를 기록한다**

`goal/09-integration-rules.md`에 다음을 명시한다.

- 장기적으로 Driver 360은 projection 우선
- bootstrap 1차는 bounded fan-out query service 허용
- fan-out 대상은 현재 4개 정본 서비스로 제한
- 프런트는 source API를 직접 합치지 않고 `driver-360` contract만 사용

- [ ] **Step 4: extraction note의 다음 우선순위를 Driver 360로 올린다**

`reference/05-ev-dashboard-server-domain-extraction-notes.md`의 다음 구현 우선순위를 아래로 정리한다.

1. Driver 360 consumer domain
2. Vehicle Ops consumer domain
3. Dispatch Control prerequisite definitions

- [ ] **Step 5: 문서 정합성 확인**

Run: `rg -n "employment_status|current_vehicle_id|pending_approval_count|latest_location_at" goal/04-driver-360-read-model.md goal/09-integration-rules.md reference/05-ev-dashboard-server-domain-extraction-notes.md`

Expected:
- `goal/04-driver-360-read-model.md`에는 있더라도 future dependency 문맥으로만 남음

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `goal/04-driver-360-read-model.md`
- `goal/09-integration-rules.md`
- `reference/05-ev-dashboard-server-domain-extraction-notes.md`

### Task 2: Scaffold the Driver 360 Query Service

**Files:**
- Create: `services/driver-360/Dockerfile`
- Create: `services/driver-360/entrypoint.sh`
- Create: `services/driver-360/manage.py`
- Create: `services/driver-360/requirements.txt`
- Create: `services/driver-360/config/__init__.py`
- Create: `services/driver-360/config/asgi.py`
- Create: `services/driver-360/config/settings.py`
- Create: `services/driver-360/config/urls.py`
- Create: `services/driver-360/config/wsgi.py`
- Create: `services/driver-360/driver360/__init__.py`
- Create: `services/driver-360/driver360/apps.py`
- Create: `services/driver-360/driver360/authentication.py`
- Create: `services/driver-360/driver360/exceptions.py`
- Create: `services/driver-360/driver360/permissions.py`
- Create: `services/driver-360/driver360/serializers.py`
- Create: `services/driver-360/driver360/urls.py`
- Create: `services/driver-360/driver360/views.py`
- Test: `services/driver-360/driver360/tests/test_driver360_api.py`

- [ ] **Step 1: health + detail endpoint 테스트를 먼저 쓴다**

`test_driver360_api.py`에 최소 두 케이스를 만든다.

- `GET /health/` returns `{"status": "ok"}`
- `GET /drivers/<driver_id>/` returns `501` 또는 mock 기반 `200` contract before implementation

- [ ] **Step 2: 현재 서비스 패턴을 따라 Django/DRF skeleton을 만든다**

기존 `account-auth`, `driver-profile`, `organization-master`, `settlement`와 같은 구조로 아래를 맞춘다.

- `config/settings.py`
- `driver360/authentication.py`
- `driver360/permissions.py`
- `driver360/urls.py`
- `driver360/views.py`

- [ ] **Step 3: health endpoint를 먼저 통과시킨다**

`/health/`는 인증 없이 `{"status": "ok"}`를 반환하게 만든다.

- [ ] **Step 4: driver summary detail route를 연결한다**

최종 route는 아래로 고정한다.

- `GET /drivers/<uuid:driver_id>/`

- [ ] **Step 5: service-local 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm driver-360-api python manage.py test driver360.tests.test_driver360_api -v 2`

Expected:
- health test 통과
- detail route skeleton test 통과

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `services/driver-360/Dockerfile`
- `services/driver-360/entrypoint.sh`
- `services/driver-360/manage.py`
- `services/driver-360/requirements.txt`
- `services/driver-360/config/__init__.py`
- `services/driver-360/config/asgi.py`
- `services/driver-360/config/settings.py`
- `services/driver-360/config/urls.py`
- `services/driver-360/config/wsgi.py`
- `services/driver-360/driver360/__init__.py`
- `services/driver-360/driver360/apps.py`
- `services/driver-360/driver360/authentication.py`
- `services/driver-360/driver360/exceptions.py`
- `services/driver-360/driver360/permissions.py`
- `services/driver-360/driver360/serializers.py`
- `services/driver-360/driver360/urls.py`
- `services/driver-360/driver360/views.py`
- `services/driver-360/driver360/tests/test_driver360_api.py`

### Task 3: Implement Driver Summary Aggregation

**Files:**
- Create: `services/driver-360/driver360/services/__init__.py`
- Create: `services/driver-360/driver360/services/source_clients.py`
- Create: `services/driver-360/driver360/services/driver_summary_service.py`
- Modify: `services/driver-360/driver360/serializers.py`
- Modify: `services/driver-360/driver360/views.py`
- Modify: `services/driver-360/config/settings.py`
- Test: `services/driver-360/driver360/tests/test_driver_summary_service.py`
- Modify: `services/driver-360/driver360/tests/test_driver360_api.py`

- [ ] **Step 1: summary contract 테스트를 먼저 쓴다**

`test_driver_summary_service.py`에 아래 케이스를 작성한다.

- linked account가 있는 기사 요약
- linked account가 없는 기사 요약
- settlement item이 없는 기사 요약
- source service 중 account/settlement가 비어도 driver/org는 응답 유지
- driver가 없으면 `404`

- [ ] **Step 2: source client를 분리한다**

`source_clients.py`에 아래 호출을 캡슐화한다.

- driver-profile: `GET /api/drivers/<driver_id>/`
- organization-master: `GET /api/org/companies/`, `GET /api/org/fleets/`
- account-auth: `GET /api/auth/accounts/<account_id>/`
- settlement: `GET /api/settlements/runs/`, `GET /api/settlements/items/`

모든 upstream 호출은 원요청의 `Authorization` header를 forward한다.

- [ ] **Step 3: driver summary 조립 규칙을 고정한다**

`driver_summary_service.py`는 아래 규칙으로 응답을 만든다.

- driver-profile는 필수 source
- company/fleet는 없으면 `null` 대신 `warnings`에 누락 사실 추가
- account는 `account_id`가 없으면 `null`
- settlement는 driver 기준 latest item 하나만 요약
- 정렬 기준은 `period_end desc`, 그 다음 `settlement_run_id`

- [ ] **Step 4: API view를 service 기반으로 얇게 만든다**

`views.py`는 serializer validation과 HTTP status mapping만 맡고, 조립 로직은 `driver_summary_service.py`에 둔다.

- [ ] **Step 5: service-local 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm driver-360-api python manage.py test driver360.tests -v 2`

Expected:
- summary service test 통과
- API test 통과

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `services/driver-360/driver360/services/__init__.py`
- `services/driver-360/driver360/services/source_clients.py`
- `services/driver-360/driver360/services/driver_summary_service.py`
- `services/driver-360/driver360/serializers.py`
- `services/driver-360/driver360/views.py`
- `services/driver-360/config/settings.py`
- `services/driver-360/driver360/tests/test_driver_summary_service.py`
- `services/driver-360/driver360/tests/test_driver360_api.py`

### Task 4: Wire Runtime and Gateway

**Files:**
- Modify: `docker-compose.account-driver-settlement.yml`
- Modify: `gateway/nginx.conf`
- Create: `infra/env/driver-360.env.example`
- Modify: `README.md`
- Modify: `compose/README.md`

- [ ] **Step 1: compose에 driver-360-api를 추가한다**

아래 규칙으로 새 서비스를 추가한다.

- service name: `driver-360-api`
- build context: `./services/driver-360`
- env file: `./infra/env/driver-360.env.example`
- depends_on: `account-auth-api`, `driver-profile-api`, `organization-master-api`, `settlement-api`
- expose: `8000`

- [ ] **Step 2: gateway route를 연결한다**

최종 prefix는 아래로 고정한다.

- `/api/driver-360/`

- [ ] **Step 3: env example에 upstream base URL을 기록한다**

최소 env는 아래를 가진다.

- `API_PORT=8000`
- `JWT_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `ACCOUNT_AUTH_BASE_URL=http://account-auth-api:8000`
- `DRIVER_PROFILE_BASE_URL=http://driver-profile-api:8000`
- `ORGANIZATION_MASTER_BASE_URL=http://organization-master-api:8000`
- `SETTLEMENT_BASE_URL=http://settlement-api:8000`

- [ ] **Step 4: README를 현재 런타임 구조에 맞게 갱신한다**

`README.md`와 `compose/README.md`에 아래를 추가한다.

- Driver 360 service 목적
- bootstrap은 bounded fan-out query service라는 점
- front에 Driver 360 상세 화면이 추가된다는 점

- [ ] **Step 5: compose config 검증**

Run: `docker compose -f docker-compose.account-driver-settlement.yml config`

Expected:
- exit code 0

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `docker-compose.account-driver-settlement.yml`
- `gateway/nginx.conf`
- `infra/env/driver-360.env.example`
- `README.md`
- `compose/README.md`

### Task 5: Integrate Driver 360 into Front

**Files:**
- Create: `front/src/api/driver360.ts`
- Modify: `front/src/App.tsx`
- Modify: `front/src/components/Layout.tsx`
- Modify: `front/src/pages/DriversPage.tsx`
- Create: `front/src/pages/Driver360Page.tsx`
- Create: `front/src/pages/Driver360Page.test.tsx`
- Modify: `front/src/types.ts`

- [ ] **Step 1: front contract 테스트를 먼저 쓴다**

`Driver360Page.test.tsx`에 아래를 작성한다.

- page mount 시 driver summary load
- account가 없는 기사도 렌더링
- settlement가 없는 기사도 렌더링
- API error 시 에러 banner 노출

- [ ] **Step 2: driver360 API client를 추가한다**

`front/src/api/driver360.ts`에 아래 함수 하나를 둔다.

- `getDriver360(client, driverId)`

- [ ] **Step 3: types를 read-model 중심으로 추가한다**

`front/src/types.ts`에 아래를 추가한다.

- `Driver360Summary`
- `Driver360AccountSummary`
- `Driver360SettlementSummary`
- `Driver360Warnings`

- [ ] **Step 4: DriversPage에서 상세 진입을 추가한다**

각 기사 row에서 `/drivers/<driver_id>`로 이동할 수 있게 만든다.

- [ ] **Step 5: Driver360Page를 추가한다**

페이지는 아래 블록으로 나눈다.

- driver identity
- organization summary
- account summary
- latest settlement summary
- warnings

- [ ] **Step 6: App과 Layout을 route 기준으로 갱신한다**

최종 route는 아래로 둔다.

- `/drivers`
- `/drivers/:driverId`

- [ ] **Step 7: front 테스트와 build 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run test -- --run`

Expected:
- front tests pass

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run build`

Expected:
- front build pass

- [ ] **Step 8: Ready-to-Commit File List 기록**

- `front/src/api/driver360.ts`
- `front/src/App.tsx`
- `front/src/components/Layout.tsx`
- `front/src/pages/DriversPage.tsx`
- `front/src/pages/Driver360Page.tsx`
- `front/src/pages/Driver360Page.test.tsx`
- `front/src/types.ts`

### Task 6: End-to-End Verification

**Files:**
- Modify: `compose/README.md`

- [ ] **Step 1: 전체 스택 재기동**

Run: `docker compose -f docker-compose.account-driver-settlement.yml up --build -d`

Expected:
- gateway, front, admin-front, account-auth-api, driver-profile-api, settlement-api, organization-master-api, driver-360-api, DB, redis, seed-runner가 정상 기동

- [ ] **Step 2: health 확인**

Run:

```bash
curl -fsS http://localhost:8080/api/driver-360/health/
curl -fsS http://localhost:8080/api/auth/health/
curl -fsS http://localhost:8080/api/drivers/health/
curl -fsS http://localhost:8080/api/org/health/
curl -fsS http://localhost:8080/api/settlements/health/
```

Expected:
- 모두 `{"status":"ok"}`

- [ ] **Step 3: driver-360 HTTP smoke**

Run:

```bash
ACCESS_TOKEN=$(curl -sS -X POST http://localhost:8080/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"change-me"}' | python -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

curl -fsS http://localhost:8080/api/driver-360/drivers/10000000-0000-0000-0000-000000000001/ \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

Expected:
- `driver_name`, `company_name`, `fleet_name` 포함
- linked account가 있으면 `account` 블록 포함
- settlement placeholder 데이터가 있으면 latest settlement 요약 포함

- [ ] **Step 4: front smoke**

확인할 항목:

- `http://localhost:8080/drivers`에서 기사 목록 로드
- 기사 상세 링크 클릭 시 `/drivers/<driver_id>` 이동
- Driver 360 카드에 조직/계정/정산 요약 렌더링

- [ ] **Step 5: 문서 업데이트**

`compose/README.md`에 아래를 적는다.

- Driver 360은 projection DB가 아닌 bounded query service
- 다음 후보는 Vehicle Ops

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `compose/README.md`

## Follow-up, Not in This Plan

아래는 Driver 360 bootstrap 이후의 다음 backlog로 미룬다.

1. Driver 360 timeline
2. materialized projection 저장소
3. Vehicle Ops consumer domain
4. Dispatch Control consumer domain
5. source service summary endpoint 최적화
