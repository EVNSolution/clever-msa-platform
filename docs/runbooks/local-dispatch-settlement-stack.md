# Local Dispatch/Settlement Stack Runbook

## Purpose

이 문서는 현재 `CLEVER MSA` 로컬 검증에서 `배송원 -> 배차 -> 정산` 흐름을 가장 빠르게 올리고 확인하는 절차를 정리한 정본 runbook이다.

이 문서는 아래 질문에 답해야 한다.

- `5174`와 `8080`의 역할이 무엇인가
- full Docker stack과 low-CPU hybrid를 언제 써야 하는가
- 로컬에서 무엇을 먼저 띄워야 하는가
- 로그인/배차/정산이 안 열릴 때 어디를 확인해야 하는가
- seed가 끝났는지, 정상 계정이 있는지 어떻게 확인하는가

## Source Of Truth

이 runbook는 아래 문서를 전제로 한다.

- 플랫폼 루트 원칙: [WORKSPACE.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md)
- repo 역할: [repo-map.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md)
- 현재 runtime inventory: [current-runtime-inventory.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md)
- local integration shell 안내: [development/integration-local-stack/README.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack/README.md)

## URL Meaning

- `http://localhost:5174`
  - `front-web-console` host Vite dev server
  - 프런트 수정 확인용
  - `/api`는 기본적으로 `http://localhost:8080`으로 프록시된다
- `http://localhost:8080`
  - gateway 뒤의 통합 진입점
  - 최종 통합 확인용
  - full stack에서는 built frontend container를 본다
  - low-CPU hybrid에서는 dev gateway가 host frontend와 host Django를 묶을 수 있다

중요:
- `5174`는 프런트만 서빙한다
- 앱 자체는 API 의존형이라 backend 없이 실사용 smoke를 할 수는 없다
- 따라서 로그인, 회사 목록, 배차/정산 API 확인은 결국 `8080` 경로가 살아 있어야 한다

## Choose A Mode

### Full Docker Stack

이 모드를 쓴다.

- `배송원 -> 배차 -> 정산`을 실제처럼 한 번에 확인하고 싶을 때
- seed까지 포함한 배포형 로컬 확인을 하고 싶을 때
- `8080` 기준 smoke를 해야 할 때

장점:
- 가장 실제 운영 구조와 비슷하다
- seed-runner가 같이 돌아서 계정과 fixture가 준비된다

단점:
- Docker Desktop 부하가 크다
- 프런트 수정 loop에는 느리다

### Low-CPU Hybrid

이 모드를 쓴다.

- backend 몇 개만 빠르게 수정/디버깅할 때
- Docker Desktop 자원을 줄여야 할 때
- 프런트는 `5174`, backend는 host runserver로 보고 싶을 때

장점:
- 가볍다
- 특정 서비스만 host에서 바로 수정/재시작하기 쉽다

단점:
- 수동으로 띄워야 할 서비스가 늘어난다
- full integration smoke에는 부적합하다

## Standard Full Stack Bring-Up

작업 디렉토리:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack
```

최초 또는 이미지 갱신 후:

```bash
docker compose -f docker-compose.account-driver-settlement.yml build
```

기동:

```bash
docker compose -f docker-compose.account-driver-settlement.yml up -d
```

중지:

```bash
docker compose -f docker-compose.account-driver-settlement.yml down
```

컨테이너까지 정리:

```bash
docker compose -f docker-compose.account-driver-settlement.yml down -v
```

## Standard Low-CPU Hybrid Bring-Up

작업 디렉토리:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack
```

infra only:

```bash
./scripts/up_dev_infra.sh
./scripts/up_dev_gateway.sh
```

프런트:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run dev
```

필요 service만 host에서 실행:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack
./scripts/run_host_django_service.sh ../service-account-access ./infra/env/host/account-auth.env.example
./scripts/run_host_django_service.sh ../service-organization-registry ./infra/env/host/organization-master.env.example
./scripts/run_host_django_service.sh ../service-driver-profile ./infra/env/host/driver-profile.env.example
./scripts/run_host_django_service.sh ../service-dispatch-registry ./infra/env/host/dispatch-registry.env.example
./scripts/run_host_django_service.sh ../service-settlement-registry ./infra/env/host/settlement-registry.env.example
./scripts/run_host_django_service.sh ../service-delivery-record ./infra/env/host/delivery-record.env.example
./scripts/run_host_django_service.sh ../service-settlement-payroll ./infra/env/host/settlement-payroll.env.example
./scripts/run_host_django_service.sh ../service-settlement-operations-view ./infra/env/host/settlement-ops.env.example
```

중지:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack
./scripts/down_dev_gateway.sh
./scripts/down_dev_infra.sh
```

## Preflight Checks

### Full Stack

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -i http://127.0.0.1:8080/healthz
curl -i http://127.0.0.1:8080/api/auth/health/
curl -i http://127.0.0.1:8080/api/org/companies/public/
```

기대값:

- gateway가 `healthy`
- `GET /healthz` -> `200`
- `GET /api/auth/health/` -> `200`
- `GET /api/org/companies/public/` -> `200`

### Frontend Dev

```bash
curl -i http://127.0.0.1:5174/
curl -i http://127.0.0.1:5174/api/org/companies/public/
```

기대값:

- `/` -> `200`
- `/api/org/companies/public/` -> `200`

중요:
- `5174` root HTML이 `200`이어도 `/api/*`가 실패하면 앱은 로그인 화면에서 `Request failed.`를 띄울 수 있다

## Seed Expectations

full stack에서는 `seed-runner`가 기본 fixture를 넣는다.

확인:

```bash
docker logs integration-local-stack-seed-runner-1 --tail 200
```

기대 로그:

- 각 서비스 health wait 완료
- `seed_*` management command 실행
- 마지막에 `Seed runner completed successfully.`

seed가 끝나지 않으면:

- 로그인 계정이 없을 수 있다
- 회사 목록과 fixture 데이터가 비어 보일 수 있다
- 배차/정산 smoke가 불안정할 수 있다

## Local Login Accounts

현재 seed 기준으로 바로 쓰는 계정:

- 시스템 관리자
  - `seed-admin@example.com`
  - `imjing12!`
- 정산 관리자
  - `seed-settlement-manager@example.com`
  - `change-me-settlement-manager`

## Current Test Flow For Driver -> Dispatch -> Settlement

현재 UI 기준 진입 순서는 이렇다.

1. `http://localhost:5174` 또는 `http://localhost:8080`에서 로그인
2. `배송원`에서 기사/배송원 데이터 확인
3. `배차 > 배차 보드` 이동
4. 필요하면 `예상 물량 입력`
5. 목록에서 `보드 열기`
6. 상세 화면에서 `배차표 업로드`
7. preview 확인 후 확정
8. `정산 > 정산 기준`에서 전역 설정과 회사·플릿 단가표 확인
9. `정산 > 정산 입력`에서 upload-first review 확인
10. `정산 실행`
11. `정산 결과` 조회

주의:
- `배차표 업로드`는 현재 목록 화면이 아니라 `배차 보드 상세` 안에 있다
- 목록 화면 CTA는 아직 `예상 물량 입력` 중심이다

## Current Settlement/Dispatch Rules

- `배송매니저 이름`은 배송원 `external_user_name`과 매칭한다
- `박스 수`는 정산 근거다
- `가구 수`는 운영/시간예측 메타데이터다
- 권역은 문자열과 상하 관계 reference로만 취급한다
- `세금/공제/보험`은 전역 정산 설정
- `박스당 단가/특근비`는 회사·플릿 단가표

## Troubleshooting

### 1. `http://localhost:5174`에서 `Request failed.`가 뜬다

의미:
- 대개 프런트가 깨진 게 아니라 `/api/*` 프록시가 실패한 것이다

확인:

```bash
curl -i http://127.0.0.1:5174/
curl -i http://127.0.0.1:5174/api/org/companies/public/
curl -i http://127.0.0.1:8080/healthz
```

판단:

- `5174 /`는 `200`인데 `5174 /api/...`가 실패하면 backend/gateway 문제다
- `vite.config.ts`는 `/api`를 기본적으로 `http://localhost:8080`으로 프록시한다

조치:

- full stack이면 `gateway`, `auth`, `org` 컨테이너 상태부터 확인
- hybrid면 `up_dev_gateway.sh`와 필요한 host Django를 다시 띄운다

### 2. `http://localhost:8080`이 열리지 않거나 connection refused가 난다

의미:
- gateway가 안 떠 있거나 compose 전체가 내려간 상태다

확인:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
curl -i http://127.0.0.1:8080/healthz
```

조치:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack
docker compose -f docker-compose.account-driver-settlement.yml up -d gateway
```

full smoke가 목적이면 전체 stack을 다시 올린다.

### 3. `8080/healthz`는 되는데 로그인이나 회사 목록이 안 열린다

의미:
- gateway 프로세스는 살아 있지만 upstream API가 아직 준비되지 않았을 수 있다

확인:

```bash
curl -i http://127.0.0.1:8080/api/auth/health/
curl -i http://127.0.0.1:8080/api/org/companies/public/
docker logs integration-local-stack-seed-runner-1 --tail 200
```

조치:

- `auth`와 `org` health가 `200`인지 확인
- seed-runner가 끝나지 않았으면 완료까지 기다린다
- seed-runner 실패면 로그에서 실패 서비스부터 확인한다

### 4. `identity-me`가 `401`, `identity-refresh`가 `403`이다

이건 항상 장애는 아니다.

의미:
- `401` on `identity-me`: 아직 로그인하지 않음
- `403` on `identity-refresh`: refresh cookie 없음

즉 unauthenticated 상태에서는 정상일 수 있다.

### 5. `5174`는 뜨는데 로그인 화면에서 회사 선택이 비어 있다

의미:
- `/api/org/companies/public/` 호출이 실패했거나 seed가 아직 안 끝난 것이다

확인:

```bash
curl -i http://127.0.0.1:5174/api/org/companies/public/
curl -i http://127.0.0.1:8080/api/org/companies/public/
docker logs integration-local-stack-seed-runner-1 --tail 100
```

조치:

- org service health 확인
- seed-runner 완료 여부 확인

### 6. `배차표 업로드`가 안 보인다

의미:
- 현재 UX상 업로드는 `배차 보드 상세` 안에 있다

조치:

1. `배차 > 배차 보드`
2. 해당 행 `보드 열기`
3. 상세 화면에서 `배차표 업로드`

목록 화면에서 바로 안 보이는 것은 현재 UI 구조상 정상이다.

### 7. seed 계정으로 로그인했는데 배차/정산 데이터가 비어 있다

의미:
- seed-runner가 중간에 실패했거나, 일부 서비스 seed만 끝난 상태일 수 있다

확인:

```bash
docker logs integration-local-stack-seed-runner-1 --tail 300
```

조치:

- 실패 서비스 로그를 본다
- 필요하면 대상 서비스 migrate 상태를 먼저 점검한다
- 그 뒤 seed-runner를 다시 실행한다

### 8. Full stack은 무거운데 실제 smoke는 해야 한다

권장:

- 평소 개발: low-CPU hybrid
- 실제 `배송원 -> 배차 -> 정산` smoke: full stack
- 확인 후 즉시 `docker compose ... down`

즉 full stack은 상시 개발용이 아니라 통합 확인용으로만 쓴다.

## Minimal Smoke Commands

### Full Stack Health

```bash
curl -i http://127.0.0.1:8080/healthz
curl -i http://127.0.0.1:8080/api/auth/health/
curl -i http://127.0.0.1:8080/api/org/companies/public/
```

### Login Smoke

```bash
curl -i -X POST http://127.0.0.1:8080/api/auth/identity-login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"seed-settlement-manager@example.com","password":"change-me-settlement-manager"}'
```

### Frontend Proxy Smoke

```bash
curl -i http://127.0.0.1:5174/api/org/companies/public/
```

## Shutdown Rule

- full stack smoke가 끝나면 container를 내린다
- low-CPU hybrid는 dev gateway와 infra만 유지하고, host runserver는 필요한 동안만 켠다

권장 종료:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/integration-local-stack
docker compose -f docker-compose.account-driver-settlement.yml down
```

또는 hybrid:

```bash
./scripts/down_dev_gateway.sh
./scripts/down_dev_infra.sh
```
