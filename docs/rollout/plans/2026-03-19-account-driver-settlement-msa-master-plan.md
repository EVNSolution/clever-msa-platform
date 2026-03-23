# Account / Driver / Settlement MSA Master Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `계정(Account/Auth)`, `배송원(Driver Profile HR)`, `정산(Settlement Payroll)`, `최소 Organization Master` 중심의 MSA 재설계 산출물을 이 계획 저장소 안에서 정리하고, 로컬 Docker Compose 시뮬레이션 골격까지 만든다.

**Architecture:** 현재 저장소는 구현 저장소가 아니라 설계 작업공간이므로, 이번 계획은 실제 서비스 코드 분리보다 먼저 `goal/`, `reference/`, `compose/` 산출물을 정리하는 데 집중한다. 도메인 경계와 소유 데이터는 이미 스펙으로 고정됐으므로, 실행 단계에서는 이를 목표 문서 체계에 편입하고, 현행 API/소스 근거를 새 경계에 매핑하고, 서비스별 DB가 분리된 로컬 Compose 시뮬레이션 골격을 만든다.

**Tech Stack:** Markdown, Docker Compose, dotenv-style env examples, Nginx gateway placeholder config

---

## File Structure

이번 계획은 아래 파일 구조를 기준으로 진행한다.

- Create: `goal/11-account-driver-settlement-boundary-map.md`
- Create: `goal/12-account-driver-settlement-owned-data-matrix.md`
- Create: `goal/13-account-driver-settlement-compose-simulation.md`
- Create: `reference/03-account-driver-settlement-legacy-cut-map.md`
- Create: `reference/04-account-driver-settlement-source-index.md`
- Create: `compose/README.md`
- Create: `compose/env/account-auth.env.example`
- Create: `compose/env/driver-profile.env.example`
- Create: `compose/env/settlement.env.example`
- Create: `compose/env/organization-master.env.example`
- Create: `compose/gateway/nginx.conf`
- Create: `docker-compose.account-driver-settlement.yml`
- Create: `docs/superpowers/plans/2026-03-19-account-driver-settlement-implementation-handoff.md`
- Modify: `README.md`
- Modify: `goal/03-roadmap.md`
- Modify: `goal/06-id-and-state-dictionary.md`
- Modify: `goal/07-legacy-api-mapping.md`
- Modify: `goal/08-rollout-order.md`

## Scope Note

이 스펙은 실제로는 여러 독립 서비스로 이어질 수 있으므로, 이 마스터 플랜은 `설계 저장소 정리 + 시뮬레이션 골격`까지만 다룬다. 실제 구현 저장소에서 코드를 분리하기 시작할 때는 아래 산출물을 입력으로 삼아 서비스별 세부 계획을 별도로 파생시킨다.

### Task 1: 목표 문서 체계에 스코프 편입

**Files:**
- Create: `goal/11-account-driver-settlement-boundary-map.md`
- Create: `goal/12-account-driver-settlement-owned-data-matrix.md`
- Modify: `README.md`
- Modify: `goal/03-roadmap.md`

- [ ] **Step 1: 경계 문서 초안 작성**

`goal/11-account-driver-settlement-boundary-map.md`에 아래 구조를 그대로 넣는다.

```md
# 11. Account / Driver / Settlement Boundary Map

## 문서 목적

이 문서는 `Account / Auth`, `Driver Profile HR`, `Settlement Payroll`, `Organization Master` 경계를 기존 목표 문서 체계 안으로 편입하는 문서다.

## 포함 서비스

1. Organization Master
2. Account / Auth
3. Driver Profile HR
4. Settlement Payroll

## 경계 규칙

1. `account_id`와 `driver_id`는 절대 합치지 않는다.
2. Organization Master는 `company`, `fleet`, `org_unit`, `org_membership_policy`, `affiliation_reference_dictionary`를 정본으로 가진다.
3. Settlement는 계산 결과와 지급 상태만 소유한다.
4. Driver는 프로필과 재직 상태를 소유하고 자격 증명은 소유하지 않는다.
```

- [ ] **Step 2: 소유 데이터 매트릭스 작성**

`goal/12-account-driver-settlement-owned-data-matrix.md`에 아래 표 뼈대를 넣고 각 도메인의 Owned / Reference / Forbidden을 채운다.

```md
# 12. Account / Driver / Settlement Owned Data Matrix

| Domain | Owned | Reference Only | Forbidden |
|---|---|---|---|
| Organization Master | company, fleet, org_unit, org_membership_policy, affiliation_reference_dictionary | 없음 또는 최소 | account credential, driver status, settlement result |
| Account / Auth | account, credential, session, token | driver_id, company_id, fleet_id | driver profile, settlement ledger |
| Driver Profile HR | driver, profile, employment_status, qualification_status | account_id, company_id, fleet_id, org_unit_id | password, otp_secret, payout_status |
| Settlement Payroll | settlement_run, settlement_item, deduction, incentive, payout_status | driver_id, company_id, fleet_id | account credential, driver profile |
```

- [ ] **Step 3: 루트 README에 신규 문서 링크 추가**

`README.md`의 Goal 목록에 아래 링크를 추가한다.

```md
- [goal/11-account-driver-settlement-boundary-map.md](./goal/11-account-driver-settlement-boundary-map.md): Account / Driver / Settlement Boundary
- [goal/12-account-driver-settlement-owned-data-matrix.md](./goal/12-account-driver-settlement-owned-data-matrix.md): Owned Data Matrix
- [goal/13-account-driver-settlement-compose-simulation.md](./goal/13-account-driver-settlement-compose-simulation.md): Compose Simulation
```

- [ ] **Step 4: 로드맵 문서에 신규 스코프 연결**

`goal/03-roadmap.md`의 `이 단계 산출 문서` 목록 아래에 아래 항목을 추가한다.

```md
8. 11-account-driver-settlement-boundary-map.md
9. 12-account-driver-settlement-owned-data-matrix.md
10. 13-account-driver-settlement-compose-simulation.md
```

- [ ] **Step 5: 링크 존재 여부 확인**

Run: `rg -n "11-account-driver-settlement|12-account-driver-settlement|13-account-driver-settlement" README.md goal/03-roadmap.md`

Expected: 세 파일명이 `README.md`와 `goal/03-roadmap.md`에서 모두 검색된다.

- [ ] **Step 6: Ready-to-Commit File List 기록**

현재 작업공간은 Git 저장소가 아니므로 아래 파일을 ready-to-commit 대상으로 기록한다.

- `README.md`
- `goal/03-roadmap.md`
- `goal/11-account-driver-settlement-boundary-map.md`
- `goal/12-account-driver-settlement-owned-data-matrix.md`
- Suggested commit message: `docs: add account driver settlement boundary docs`

### Task 2: 식별자/정산/레거시 매핑 기준 고정

**Files:**
- Modify: `goal/06-id-and-state-dictionary.md`
- Modify: `goal/07-legacy-api-mapping.md`
- Create: `reference/03-account-driver-settlement-legacy-cut-map.md`
- Create: `reference/04-account-driver-settlement-source-index.md`

- [ ] **Step 1: ID 사전에 스코프 식별자 추가**

`goal/06-id-and-state-dictionary.md`에 아래 블록을 추가한다.

```md
## Scoped Domain IDs

- `account_id`: 인증 주체 식별자
- `driver_id`: 배송원 업무 주체 식별자
- `company_id`: 회사 정본 식별자
- `fleet_id`: 플릿 정본 식별자
- `org_unit_id`: 조직 단위 식별자
- `settlement_run_id`: 정산 실행 단위 식별자
- `settlement_item_id`: 정산 결과 항목 식별자

## Scoped Separation Rules

1. `account_id` != `driver_id`
2. `settlement_item_id`는 사람 식별자로 사용 금지
3. `company_id`, `fleet_id`, `org_unit_id`는 Organization Master만 정본
```

- [ ] **Step 2: 레거시 API 매핑 문서에 새 분류 기준 반영**

`goal/07-legacy-api-mapping.md`에 아래 분류 축을 추가한다.

```md
## Scoped Mapping Columns

- target_domain
- keep_or_split
- ownership_reason

예시:

| Legacy Namespace | Path Pattern | target_domain | keep_or_split | ownership_reason |
|---|---|---|---|---|
| documents | /api/documents/... | Driver Profile HR or Settlement Payroll | split | 문서 도메인 내부에 사람/정산 책임이 혼합되어 있음 |
| auth | /api/auth/... | Account / Auth | keep | 인증 주체 경계와 일치 |
| core | /api/core/companies/... | Organization Master | keep | 조직 정본 |
```

- [ ] **Step 3: scoped legacy cut map 문서 작성**

`reference/03-account-driver-settlement-legacy-cut-map.md`에 아래 섹션을 만든다.

```md
# 03. Account / Driver / Settlement Legacy Cut Map

## 목적

현재 namespace와 URL이 새로운 네 도메인으로 어떻게 잘려야 하는지 정리한다.

## 우선 매핑 후보

- `/api/auth` -> Account / Auth
- `/api/users`, `/api/core/users` -> Identity Access (Account / Auth) merge/cleanup target
- `/api/documents` -> Driver Profile HR + Settlement Payroll 분리 대상
- `/api/core/companies`, `/api/core/fleets` -> Organization Master
```

- [ ] **Step 4: 소스 인덱스 문서 작성**

`reference/04-account-driver-settlement-source-index.md`에 아래 뼈대를 만든다.

```md
# 04. Account / Driver / Settlement Source Index

## 서버 쪽 우선 확인 경로

- `ev-dashboard-server/src/ev_dashboard/urls.py`
- documents namespace URL / view / serializer 경로
- auth namespace URL / view / serializer 경로
- core companies / fleets / users 경로

## 프론트 쪽 우선 확인 경로

- web frontend env / API client 설정
- driver app API base URL 설정
- IVI network service 설정
```

- [ ] **Step 5: placeholder 검증**

Run: `rg -n "TODO|TBD|FIXME" goal/06-id-and-state-dictionary.md goal/07-legacy-api-mapping.md reference/03-account-driver-settlement-legacy-cut-map.md reference/04-account-driver-settlement-source-index.md`

Expected: 새로 추가한 scoped sections에 placeholder가 없다.

- [ ] **Step 6: Ready-to-Commit File List 기록**

현재 작업공간은 Git 저장소가 아니므로 아래 파일을 ready-to-commit 대상으로 기록한다.

- `goal/06-id-and-state-dictionary.md`
- `goal/07-legacy-api-mapping.md`
- `reference/03-account-driver-settlement-legacy-cut-map.md`
- `reference/04-account-driver-settlement-source-index.md`
- Suggested commit message: `docs: map scoped ids and legacy boundaries`

### Task 3: 로컬 Compose 시뮬레이션 골격 추가

**Files:**
- Create: `goal/13-account-driver-settlement-compose-simulation.md`
- Create: `compose/README.md`
- Create: `compose/env/account-auth.env.example`
- Create: `compose/env/driver-profile.env.example`
- Create: `compose/env/settlement.env.example`
- Create: `compose/env/organization-master.env.example`
- Create: `compose/gateway/nginx.conf`
- Create: `docker-compose.account-driver-settlement.yml`

- [ ] **Step 1: Compose 설명 문서 작성**

`goal/13-account-driver-settlement-compose-simulation.md`에 아래 구조를 넣는다.

```md
# 13. Account / Driver / Settlement Compose Simulation

## 목적

로컬에서 서비스 경계와 DB 경계를 시뮬레이션하기 위한 Compose 골격을 정의한다.

## 서비스

- web-front
- admin-front
- api-gateway
- organization-master-api
- account-auth-api
- driver-profile-api
- settlement-api
- db-admin
- log-viewer
- seed-runner

## 원칙

1. 서비스별 DB 분리
2. 도메인 간 DB 직접 접근 금지
3. front와 ops helper는 정본 데이터를 소유하지 않음
4. 이벤트 브로커는 이번 스코프에서 제외
```

- [ ] **Step 2: env example 파일 생성**

각 env 파일에 아래 형식을 맞춰 작성한다.

`compose/env/account-auth.env.example`

```dotenv
SERVICE_NAME=account-auth
PORT=8101
DB_HOST=account-db
DB_PORT=5432
DB_NAME=account
DB_USER=account
DB_PASSWORD=account
```

`compose/env/driver-profile.env.example`

```dotenv
SERVICE_NAME=driver-profile
PORT=8102
DB_HOST=driver-db
DB_PORT=5432
DB_NAME=driver
DB_USER=driver
DB_PASSWORD=driver
```

`compose/env/settlement.env.example`

```dotenv
SERVICE_NAME=settlement
PORT=8103
DB_HOST=settlement-db
DB_PORT=5432
DB_NAME=settlement
DB_USER=settlement
DB_PASSWORD=settlement
```

`compose/env/organization-master.env.example`

```dotenv
SERVICE_NAME=organization-master
PORT=8104
DB_HOST=org-db
DB_PORT=5432
DB_NAME=organization
DB_USER=organization
DB_PASSWORD=organization
```

- [ ] **Step 3: gateway placeholder 설정 작성**

`compose/gateway/nginx.conf`에 아래 내용을 넣는다.

```nginx
events {}

http {
  upstream account_auth_upstream { server account-auth-api:8101; }
  upstream driver_profile_upstream { server driver-profile-api:8102; }
  upstream settlement_upstream { server settlement-api:8103; }
  upstream organization_master_upstream { server organization-master-api:8104; }

  server {
    listen 8080;

    location /api/auth/ {
      proxy_pass http://account_auth_upstream/;
    }

    location /api/drivers/ {
      proxy_pass http://driver_profile_upstream/;
    }

    location /api/settlement/ {
      proxy_pass http://settlement_upstream/;
    }

    location /api/org/ {
      proxy_pass http://organization_master_upstream/;
    }
  }
}
```

- [ ] **Step 4: compose 파일 작성**

`docker-compose.account-driver-settlement.yml`에 아래 골격을 넣는다.

```yaml
services:
  api-gateway:
    image: nginx:1.27-alpine
    ports:
      - "8080:8080"
    volumes:
      - ./compose/gateway/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - account-auth-api
      - driver-profile-api
      - settlement-api
      - organization-master-api

  account-auth-api:
    image: alpine:3.20
    env_file:
      - ./compose/env/account-auth.env.example
    command: ["sh", "-c", "while true; do sleep 3600; done"]
    depends_on:
      - account-db

  driver-profile-api:
    image: alpine:3.20
    env_file:
      - ./compose/env/driver-profile.env.example
    command: ["sh", "-c", "while true; do sleep 3600; done"]
    depends_on:
      - driver-db

  settlement-api:
    image: alpine:3.20
    env_file:
      - ./compose/env/settlement.env.example
    command: ["sh", "-c", "while true; do sleep 3600; done"]
    depends_on:
      - settlement-db

  organization-master-api:
    image: alpine:3.20
    env_file:
      - ./compose/env/organization-master.env.example
    command: ["sh", "-c", "while true; do sleep 3600; done"]
    depends_on:
      - org-db

  account-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: account
      POSTGRES_USER: account
      POSTGRES_PASSWORD: account

  driver-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: driver
      POSTGRES_USER: driver
      POSTGRES_PASSWORD: driver

  settlement-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: settlement
      POSTGRES_USER: settlement
      POSTGRES_PASSWORD: settlement

  org-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: organization
      POSTGRES_USER: organization
      POSTGRES_PASSWORD: organization

  db-admin:
    image: dpage/pgadmin4:8

  log-viewer:
    image: alpine:3.20
    command: ["sh", "-c", "while true; do sleep 3600; done"]

  seed-runner:
    image: alpine:3.20
    command: ["sh", "-c", "while true; do sleep 3600; done"]
```

- [ ] **Step 5: compose README 작성**

`compose/README.md`에 아래 문장을 포함한다.

```md
# Compose Simulation

이 폴더는 실제 서비스 실행이 아니라 경계 시뮬레이션용 골격을 둔다.

- 각 도메인은 독립 DB를 가진다.
- `api-gateway`는 라우팅만 담당한다.
- `db-admin`, `log-viewer`, `seed-runner`는 운영 보조용이다.
- 이벤트 브로커와 읽기 모델 통합 조회는 이번 스코프에 포함하지 않는다.
```

- [ ] **Step 6: Compose 설정 검증**

Run: `docker compose -f docker-compose.account-driver-settlement.yml config`

Expected: YAML merge 결과가 출력되고 exit code 0으로 끝난다.

- [ ] **Step 7: Ready-to-Commit File List 기록**

현재 작업공간은 Git 저장소가 아니므로 아래 파일을 ready-to-commit 대상으로 기록한다.

- `goal/13-account-driver-settlement-compose-simulation.md`
- `compose/README.md`
- `compose/env/account-auth.env.example`
- `compose/env/driver-profile.env.example`
- `compose/env/settlement.env.example`
- `compose/env/organization-master.env.example`
- `compose/gateway/nginx.conf`
- `docker-compose.account-driver-settlement.yml`
- Suggested commit message: `ops: add scoped msa compose simulation skeleton`

### Task 4: 롤아웃 순서와 구현 핸드오프 기준 정리

**Files:**
- Modify: `goal/08-rollout-order.md`
- Create: `docs/superpowers/plans/2026-03-19-account-driver-settlement-implementation-handoff.md`
- Modify: `README.md`

- [ ] **Step 1: rollout 문서에 scoped 순서 주석 추가**

`goal/08-rollout-order.md`에 아래 메모를 추가한다.

```md
## Scoped Master Plan Note

`Account / Driver / Settlement / Organization Master` 스코프에서는 아래 순서를 기본으로 본다.

1. Organization Master 경계 고정
2. Account / Auth 경계 고정
3. Driver Profile HR 경계 고정
4. Settlement Payroll 경계 고정
5. Compose 시뮬레이션으로 경계 확인
```

- [ ] **Step 2: README에 spec / plan 연결**

`README.md`에 아래 항목을 추가한다.

```md
### Reference

- [reference/03-account-driver-settlement-legacy-cut-map.md](./reference/03-account-driver-settlement-legacy-cut-map.md): Scoped legacy cut map
- [reference/04-account-driver-settlement-source-index.md](./reference/04-account-driver-settlement-source-index.md): Scoped source index

### Compose

- [compose/README.md](./compose/README.md): Compose simulation guide

### Superpowers Docs

- [docs/superpowers/specs/2026-03-19-account-driver-settlement-msa-design.md](./docs/superpowers/specs/2026-03-19-account-driver-settlement-msa-design.md): Scoped design spec
- [docs/superpowers/plans/2026-03-19-account-driver-settlement-msa-master-plan.md](./docs/superpowers/plans/2026-03-19-account-driver-settlement-msa-master-plan.md): Execution plan
- [docs/superpowers/plans/2026-03-19-account-driver-settlement-implementation-handoff.md](./docs/superpowers/plans/2026-03-19-account-driver-settlement-implementation-handoff.md): Implementation handoff
```

- [ ] **Step 3: handoff checklist 문서 작성**

`docs/superpowers/plans/2026-03-19-account-driver-settlement-implementation-handoff.md`에 아래 체크리스트를 작성한다.

```md
## Implementation Handoff Checklist

## Repo Target Decisions

- 실제 server repo 경로 확정
- `web-front`와 `admin-front`가 하나의 frontend repo를 공유하는지, 아니면 두 개 repo로 분리되는지와 각 실제 repo 경로 확정
- account-auth service target repo 확정
- driver-profile service target repo 확정
- settlement service target repo 확정
- org-master service target repo 확정
```

- [ ] **Step 4: 링크 및 문서 연결 검증**

Run: `rg -n "Scoped design spec|Execution plan|Scoped Master Plan Note|Implementation Handoff Checklist" README.md goal/08-rollout-order.md docs/superpowers/plans/2026-03-19-account-driver-settlement-implementation-handoff.md`

Expected: README와 rollout 문서, handoff 문서에서 연결 문자열이 모두 조회된다.

- [ ] **Step 5: Ready-to-Commit File List 기록**

현재 작업공간은 Git 저장소가 아니므로 아래 파일을 ready-to-commit 대상으로 기록한다.

- `README.md`
- `goal/08-rollout-order.md`
- `docs/superpowers/plans/2026-03-19-account-driver-settlement-msa-master-plan.md`
- `docs/superpowers/plans/2026-03-19-account-driver-settlement-implementation-handoff.md`
- Suggested commit message: `docs: wire scoped msa plan into rollout and readme`

## Execution Guardrails

- 자동 테스트 시나리오는 이번 사용자 요청에 따라 계획 범위에서 제외한다.
- 대신 각 단계는 `placeholder 없음`, `링크 연결 확인`, `docker compose config 통과`로 검증한다.
- 현재 작업공간은 Git 저장소가 아니므로 각 task의 `commit` step은 `ready-to-commit file list 기록`으로 대체한다.
- 실제 서비스 저장소에서 코드 구현을 시작하기 전에, 이 마스터 플랜에서 파생된 서비스별 세부 계획을 다시 작성한다.

## Self-Review Checklist

- [ ] 모든 신규 goal 문서가 루트 `README.md`에서 링크되는가
- [ ] `goal/06`, `goal/07`, `goal/08`이 scoped 설계와 충돌하지 않는가
- [ ] Compose 파일이 서비스별 DB 분리를 명시하는가
- [ ] Gateway가 네 도메인 경계를 라우팅 수준에서만 표현하는가
- [ ] 실제 구현이 필요한 저장소 목록이 handoff checklist에 드러나는가
