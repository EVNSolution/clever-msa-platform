# Trimmed Bootstrap Refactor Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 로컬 MSA bootstrap을 `Company/Fleet-only Organization Master`, `기본 Driver Profile`, `legacy logic-free Settlement placeholder` 범위로 다시 정렬한다.

**Architecture:** 기존 bootstrap의 기동 구조는 유지하고, 과도하게 잡힌 도메인 필드와 UI surface를 잘라낸다. 레거시 `ev-dashboard-server`는 계산식이나 조직 구조를 이식하기 위한 원본이 아니라, 무엇을 버려야 하는지 보여 주는 anti-pattern source로만 사용한다.

**Tech Stack:** Django/DRF, React/Vite, Docker Compose, Nginx, Postgres, Redis

**Execution constraints:**

1. `Task 2`, `Task 3`, `Task 5`는 release-coupled이다. backend에서 `org-unit`이나 기존 driver 필드를 제거하는 변경은 front/admin-front 소비자 정리와 같은 change set으로 다룬다.
2. service-local 테스트는 task별로 돌릴 수 있어도, stack-level completion은 `Task 5` 이후에만 주장할 수 있다.
3. seed 정합성은 `Task 2`, `Task 3`, `Task 4`에서 같이 맞춘다. `organization`, `driver`, `settlement` seed가 서로 다른 임의 회사/플릿 ID를 만들면 안 된다.

---

### Task 1: Freeze Narrowed Scope in Docs

**Files:**
- Modify: `reference/05-ev-dashboard-server-domain-extraction-notes.md`
- Modify: `docs/superpowers/specs/2026-03-19-local-django-msa-bootstrap-design.md`
- Modify: `docs/superpowers/plans/2026-03-19-local-django-msa-bootstrap-implementation-plan.md`
- Modify: `docs/superpowers/plans/2026-03-19-trimmed-bootstrap-refactor-plan.md`

- [ ] **Step 1: scope statement를 새 기준으로 통일**

아래 원칙이 bootstrap 문서에 반복해서 드러나게 수정한다.

- Organization Master는 `Company`, `Fleet`만
- Driver Profile HR는 기사 기본정보만
- Settlement Payroll은 legacy 계산 과정 참고만, 계산 동작 이식 금지

- [ ] **Step 2: bootstrap design 문서에서 잘라낼 항목 표시**

`docs/superpowers/specs/2026-03-19-local-django-msa-bootstrap-design.md`에서 다음을 제거 또는 범위 밖으로 명시한다.

- `OrgUnit`
- `employment_status`
- `qualification_status`
- `SettlementPolicy`, `SystemConfig`, `Daily/MonthlySettlement` 확장 방향

- [ ] **Step 3: implementation plan 문서를 리팩터 대상 기준으로 재작성**

기존 “확장 구현” 태스크 대신 아래 리팩터 방향이 드러나게 바꾼다.

- organization 서비스: `OrgUnit` 제거
- driver 서비스: 기본정보만 남김
- settlement 서비스: placeholder 유지 + process note 작성
- front/admin-front가 backend trim과 같이 움직여야 한다는 실행 제약 반영
- seed 불일치 금지 규칙 반영

- [ ] **Step 4: extraction note의 현재 우선순위도 trim 기준으로 재작성**

`reference/05-ev-dashboard-server-domain-extraction-notes.md`의 “다음 구현 항목”과 phase roadmap이 현재 narrowed scope와 같은 방향을 보게 수정한다.

- [ ] **Step 5: 문서 교차 참조 확인**

Run: `rg -n "OrgUnit|employment_status|qualification_status|SettlementPolicy|SystemConfig" docs/superpowers/specs docs/superpowers/plans reference/05-ev-dashboard-server-domain-extraction-notes.md`

Expected:
- 남아 있어도 “버릴 것” 또는 “범위 밖” 문맥으로만 보인다

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `reference/05-ev-dashboard-server-domain-extraction-notes.md`
- `docs/superpowers/specs/2026-03-19-local-django-msa-bootstrap-design.md`
- `docs/superpowers/plans/2026-03-19-local-django-msa-bootstrap-implementation-plan.md`
- `docs/superpowers/plans/2026-03-19-trimmed-bootstrap-refactor-plan.md`

### Task 2: Trim Organization Master to Company/Fleet Only

**Files:**
- Modify: `services/organization-master/organizations/models.py`
- Modify: `services/organization-master/organizations/serializers.py`
- Modify: `services/organization-master/organizations/views.py`
- Modify: `services/organization-master/organizations/urls.py`
- Modify: `services/organization-master/organizations/management/commands/seed_organization.py`
- Modify: `services/organization-master/organizations/tests/test_organization_api.py`
- Create: `services/organization-master/organizations/migrations/0002_remove_orgunit.py`

- [ ] **Step 1: OrgUnit 모델 제거**

`organizations/models.py`에서 `OrgUnit`을 제거하고 `Company`, `Fleet`만 남긴다.

- [ ] **Step 2: serializer/view/route에서 org-unit surface 제거**

아래를 삭제한다.

- `OrgUnitSerializer`
- `OrgUnitViewSet`
- `/org/org-units/` route

- [ ] **Step 3: seed를 company/fleet만 생성하도록 정리**

`seed_organization.py`는 회사와 플릿만 idempotent하게 생성하게 바꾼다. 후속 seed가 같은 레코드를 안정적으로 재사용할 수 있도록 natural key 또는 deterministic seed ID 규칙도 함께 고정한다.

- [ ] **Step 4: migration 추가**

`0002_remove_orgunit.py`에서 `OrgUnit` 제거를 반영한다.

- [ ] **Step 5: 테스트 수정**

`test_organization_api.py`를 다음 기준으로 재작성한다.

- health
- company CRUD
- fleet CRUD
- user read / admin write
- `org-units` endpoint 부재 확인 또는 더 이상 테스트하지 않음

- [ ] **Step 6: service-local 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm organization-master-api python manage.py test organizations.tests -v 2`

Expected: organization 테스트 통과

주의:
- 이 단계는 service-local 확인만 의미한다.
- 전체 stack smoke는 `Task 5` 이후에만 본다.

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `services/organization-master/organizations/models.py`
- `services/organization-master/organizations/serializers.py`
- `services/organization-master/organizations/views.py`
- `services/organization-master/organizations/urls.py`
- `services/organization-master/organizations/management/commands/seed_organization.py`
- `services/organization-master/organizations/tests/test_organization_api.py`
- `services/organization-master/organizations/migrations/0002_remove_orgunit.py`

### Task 3: Reduce Driver Profile HR to Basic Profile Only

**Files:**
- Modify: `services/driver-profile/drivers/models.py`
- Modify: `services/driver-profile/drivers/serializers.py`
- Modify: `services/driver-profile/drivers/views.py`
- Modify: `services/driver-profile/drivers/urls.py`
- Modify: `services/driver-profile/drivers/management/commands/seed_drivers.py`
- Modify: `services/driver-profile/drivers/tests/test_driver_api.py`
- Create: `services/driver-profile/drivers/migrations/0002_trim_driver_profile_fields.py`

- [ ] **Step 1: DriverProfile 필드 축소**

`drivers/models.py`를 아래 필드만 남기도록 바꾼다.

- `driver_id`
- `account_id` nullable
- `company_id`
- `fleet_id`
- `name`
- `ev_id`
- `phone_number`
- `address`

- [ ] **Step 2: serializer를 새 필드 계약에 맞춤**

`drivers/serializers.py`에서 `org_unit_id`, `employment_status`, `qualification_status`를 제거한다.

- [ ] **Step 3: EV ID 중복검사 endpoint 추가**

`drivers/views.py`와 `drivers/urls.py`에 `GET /drivers/check-ev-id/?ev_id=...&company_id=...` 또는 동등 endpoint를 추가한다.

목적:
- 기본 프로필 범위에서 필요한 유일한 도메인 액션을 제공

- [ ] **Step 4: seed를 기본 프로필 중심으로 재작성**

`seed_drivers.py`는 이름/EV ID/전화번호/주소/회사/플릿만 가진 샘플 기사로 바꾼다. 회사/플릿은 `seed_organization.py`가 만든 레코드를 lookup해서 연결하고, 기존 독립 UUID 하드코딩은 제거한다.

- [ ] **Step 5: 테스트 수정**

`test_driver_api.py`를 아래 기준으로 맞춘다.

- health
- driver CRUD
- EV ID 중복검사
- 인증 필요
- user/admin 모두 CRUD 허용

- [ ] **Step 6: service-local 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm driver-profile-api python manage.py test drivers.tests -v 2`

Expected: driver 테스트 통과

주의:
- 이 단계는 service-local 확인만 의미한다.
- front/admin-front가 아직 옛 필드를 읽고 있으면 stack smoke는 여전히 깨질 수 있으므로, `Task 5` 전에는 완료 주장 금지

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `services/driver-profile/drivers/models.py`
- `services/driver-profile/drivers/serializers.py`
- `services/driver-profile/drivers/views.py`
- `services/driver-profile/drivers/urls.py`
- `services/driver-profile/drivers/management/commands/seed_drivers.py`
- `services/driver-profile/drivers/tests/test_driver_api.py`
- `services/driver-profile/drivers/migrations/0002_trim_driver_profile_fields.py`

### Task 4: Reframe Settlement as Placeholder Plus Process Note

**Files:**
- Create: `reference/06-settlement-process-note.md`
- Modify: `services/settlement/settlements/models.py`
- Modify: `services/settlement/settlements/serializers.py`
- Modify: `services/settlement/settlements/views.py`
- Modify: `services/settlement/settlements/management/commands/seed_settlements.py`
- Modify: `services/settlement/settlements/tests/test_settlement_api.py`

- [ ] **Step 1: settlement process note 작성**

`reference/06-settlement-process-note.md`에 레거시 계산 과정을 아래 형식으로 정리한다.

- 입력 소스 예시
- 일일 집계 단계
- 월별 집계 단계
- 보험/세금/공제 단계
- 이번 bootstrap에서는 구현하지 않는다는 명시

- [ ] **Step 2: settlement 서비스 주석과 설명을 placeholder 기준으로 정리**

코드와 테스트 설명에서 “실제 payroll logic”처럼 읽히는 표현을 제거한다.

- `generic settlement scaffold`
- `legacy calculation not implemented`

- [ ] **Step 3: run/item 구조는 유지하되 legacy 확장 방향 제거**

`settlements/models.py`와 serializer에서 다음 방향의 확장을 넣지 않는다.

- policy
- config/rate
- daily/monthly payroll clone
- tax/insurance 공식

- [ ] **Step 4: settlement seed도 organization/driver seed와 정합화**

`seed_settlements.py`는 seeded company/fleet/driver를 lookup해서 참조를 맞춘다. 기존 `300.../400.../100...` 식 고정 UUID에 의존하면 안 된다.

- [ ] **Step 5: 테스트를 placeholder 계약 기준으로 고정**

`test_settlement_api.py`는 아래만 보장하게 유지한다.

- health
- run CRUD
- item CRUD
- admin write / user read
- 계산식 동작에 대한 기대 없음

- [ ] **Step 6: 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm settlement-api python manage.py test settlements.tests -v 2`

Expected: settlement placeholder 테스트 통과

- [ ] **Step 7: Ready-to-Commit File List 기록**

- `reference/06-settlement-process-note.md`
- `services/settlement/settlements/models.py`
- `services/settlement/settlements/serializers.py`
- `services/settlement/settlements/views.py`
- `services/settlement/settlements/management/commands/seed_settlements.py`
- `services/settlement/settlements/tests/test_settlement_api.py`

### Task 5: Align Front and Admin Front to the Trimmed Scope

**Files:**
- Modify: `front/src/types.ts`
- Modify: `front/src/api/organization.ts`
- Modify: `front/src/api/drivers.ts`
- Modify: `front/src/pages/DashboardPage.tsx`
- Modify: `front/src/pages/DriversPage.tsx`
- Modify: `front/src/pages/SettlementsPage.tsx`
- Modify: `admin-front/src/types.ts`
- Modify: `admin-front/src/api/organization.ts`
- Modify: `admin-front/src/api/drivers.ts`
- Modify: `admin-front/src/pages/OrganizationPage.tsx`
- Modify: `admin-front/src/pages/DriversPage.tsx`
- Modify: `admin-front/src/pages/SettlementsPage.tsx`

이 task는 `Task 2`, `Task 3`와 release-coupled로 본다. backend trim이 들어간 브랜치는 이 task까지 함께 마쳐야 브라우저와 compose smoke를 통과할 수 있다.

- [ ] **Step 1: org-unit 타입과 API 제거**

`front`와 `admin-front`에서 `OrgUnit` type, `listOrgUnits`, org-unit CRUD UI를 제거한다.

- [ ] **Step 2: driver form과 table을 기본정보 기준으로 교체**

드라이버 화면은 아래 필드만 다루게 바꾼다.

- `account_id(optional)`
- `company_id`
- `fleet_id`
- `name`
- `ev_id`
- `phone_number`
- `address`

- [ ] **Step 3: dashboard 조직 요약도 company/fleet만 남김**

`front/src/pages/DashboardPage.tsx`에서 org-unit 의존 화면을 제거한다.

- [ ] **Step 4: settlement UI를 placeholder 문맥으로 정리**

정산 페이지는 계산 기능을 설명하지 않고 아래만 보여 준다.

- generic run/item list
- placeholder 문구
- process note를 나중에 연결할 여지

- [ ] **Step 5: 프런트 테스트/빌드 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run test -- --run`

Expected: front 테스트 통과

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm front npm run build`

Expected: front build 통과

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm admin-front npm run test -- --run`

Expected: admin-front 테스트 통과

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm admin-front npm run build`

Expected: admin-front build 통과

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `front/src/types.ts`
- `front/src/api/organization.ts`
- `front/src/api/drivers.ts`
- `front/src/pages/DashboardPage.tsx`
- `front/src/pages/DriversPage.tsx`
- `front/src/pages/SettlementsPage.tsx`
- `admin-front/src/types.ts`
- `admin-front/src/api/organization.ts`
- `admin-front/src/api/drivers.ts`
- `admin-front/src/pages/OrganizationPage.tsx`
- `admin-front/src/pages/DriversPage.tsx`
- `admin-front/src/pages/SettlementsPage.tsx`

### Task 6: Account / Auth Follow-up Work After Scope Trim

**Files:**
- Modify: `services/account-auth/accounts/views.py`
- Modify: `services/account-auth/accounts/serializers.py`
- Modify: `services/account-auth/accounts/urls.py`
- Modify: `services/account-auth/accounts/services/refresh_registry.py`
- Create: `services/account-auth/accounts/services/lockout_service.py`
- Modify: `services/account-auth/accounts/tests/test_auth_api.py`

- [ ] **Step 1: 남겨 둘 auth 확장 범위만 정의**

이번 task에서는 아래만 구현 대상으로 본다.

- lockout
- change-password
- account-driver linking helper endpoint 또는 use-case

- [ ] **Step 2: lockout 설계 반영**

Redis 기반 실패 횟수/잠금 시간을 `accounts/services/lockout_service.py`로 분리한다.

- [ ] **Step 3: change-password endpoint 추가**

현재 auth API에 비밀번호 변경용 endpoint를 추가하고 `accounts/urls.py`에 route를 연결한다.

- [ ] **Step 4: account-driver linking은 참조 수준으로만 구현**

`DriverProfile`의 `account_id`를 도와주는 helper 수준으로만 두고, 자동 sync rule은 넣지 않는다.

- [ ] **Step 5: 테스트 실행**

Run: `docker compose -f docker-compose.account-driver-settlement.yml run --rm account-auth-api python manage.py test accounts.tests -v 2`

Expected: auth 테스트 통과

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `services/account-auth/accounts/views.py`
- `services/account-auth/accounts/serializers.py`
- `services/account-auth/accounts/urls.py`
- `services/account-auth/accounts/services/refresh_registry.py`
- `services/account-auth/accounts/services/lockout_service.py`
- `services/account-auth/accounts/tests/test_auth_api.py`

### Task 7: End-to-End Verification

**Files:**
- Modify: `README.md`
- Modify: `compose/README.md`

- [ ] **Step 1: compose config 확인**

Run: `docker compose -f docker-compose.account-driver-settlement.yml config`

Expected: exit code 0

- [ ] **Step 2: 전체 스택 기동**

Run: `docker compose -f docker-compose.account-driver-settlement.yml up --build -d`

Expected: gateway, front, admin-front, 4개 서비스, DB, redis, seed-runner가 정상 기동

- [ ] **Step 3: health 확인**

Run:

```bash
curl -fsS http://localhost:8080/api/auth/health/
curl -fsS http://localhost:8080/api/org/health/
curl -fsS http://localhost:8080/api/drivers/health/
curl -fsS http://localhost:8080/api/settlements/health/
```

Expected: 모두 `{"status":"ok"}`

- [ ] **Step 4: narrowed scope smoke 확인**

확인할 항목:

- admin login 성공
- organization은 company/fleet만 보임
- driver 화면은 기본정보 필드만 사용
- settlement는 placeholder surface로만 보임

- [ ] **Step 5: README 문구 정리**

`README.md`와 `compose/README.md`를 새 범위에 맞춰 갱신한다.

- [ ] **Step 6: Ready-to-Commit File List 기록**

- `README.md`
- `compose/README.md`
