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
  - 필요하면 remote gateway로 프록시할 수 있다
- `http://localhost:8080`
  - gateway 뒤의 통합 진입점
  - 최종 통합 확인용
  - full stack에서는 built frontend container를 본다
  - low-CPU hybrid에서는 dev gateway가 host frontend와 host Django를 묶을 수 있다

중요:
- `5174`는 프런트만 서빙한다
- 앱 자체는 API 의존형이라 backend 없이 실사용 smoke를 할 수는 없다
- 따라서 로그인, 회사 목록, 배차/정산 API 확인은 결국 `8080` 경로가 살아 있어야 한다

## Choose First

로컬 검증을 시작하기 전에 아래 세 질문으로 먼저 분기한다.

에이전트 운영 규칙:
- `5174`, `8080`, low-CPU hybrid, full Docker 중 어떤 모드로 갈지 사용자가 답하기 전에는 임의로 기동하지 않는다.
- `프론트만 확인`인지, `백엔드까지 포함`인지 먼저 확인하고, 원격 타깃을 고른 경우에만 `실데이터 CRUD 허용` 여부를 추가 확인한 뒤 실행한다.
- 사용자가 단순히 `열어줘`, `띄워줘`, `테스트해줘`라고 말한 경우에도 아래 질문을 먼저 보낸다.

1. `백엔드까지 같이 수정/검증할 건가요, 아니면 프론트만 빠르게 볼 건가요?`
2. `데이터는 로컬 localhost를 볼 건가요, 아니면 원격 타깃을 볼 건가요? 원격이면 실제 프록시와 dev/staging 테스트 타깃 중 무엇을 볼 건가요?`
3. `2번에서 실제 프록시를 골랐다면, 실제 DB에 영향을 주는 CRUD를 허용하나요?`

빠른 선택 기준:

- 프론트만 빠르게 확인 + 실데이터 사용
  - `5174`
  - `.env.local`
  - current real proxy target: `https://hub.evnlogistics.com`
  - `8080`은 굳이 올리지 않는다
- 프론트만 빠르게 확인 + 더 안전한 테스트 타깃
  - `5174`
  - `.env.local-test`
  - `npm run dev:local-test`
- 프론트만 빠르게 확인 + 실제 프록시지만 실데이터 CRUD 비허용
  - `.env.local`을 쓰지 않는다
  - `.env.local-test` 또는 더 안전한 원격 타깃으로 바꾼다
- 백엔드 개발 또는 API 디버깅
  - low-CPU hybrid 또는 full Docker
  - 필요 service를 localhost로 띄운다
- 최종 통합 확인
  - `8080`
  - full Docker stack

## Remote API Dev Mode

`5174`를 유지한 채 remote API를 붙일 수 있다. 이 모드는 프런트만 빠르게 수정하면서 실제 데이터를 확인할 때 쓴다.

실데이터 remote target:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
npm run dev
```

`.env.local` 예시:

```env
VITE_DEV_PROXY_TARGET=https://hub.evnlogistics.com
```

더 안전한 test target:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
cp .env.local-test.example .env.local-test
npm run dev:local-test
```

`.env.local-test` 예시:

```env
VITE_DEV_PROXY_TARGET=https://<dev-or-staging-gateway-domain>
```

반드시 사용자에게 보여줄 경고 문구:

`현재 로컬 프론트 테스트의 CRUD는 실제 DB에 영향을 줍니다. 변경을 원하면, PROXY TARGET을 변경하십시오.`

운영 규칙:
- `.env.local`은 실제 CRUD 영향을 감수하는 확인 모드다
- `.env.local-test`는 dev/staging 같은 더 안전한 target에 우선 사용한다
- 마지막 통합 확인은 여전히 `8080` 또는 배포 환경에서 다시 한다

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

권장 기동:

```bash
python3 ./scripts/run_local_startup.py --fresh
```

stage 순서:
- `infra`
- `wave-2-core`
- `wave-3-domain`
- `wave-4-integration`
- `wave-5-views`
- `edge`
- `seed`
- `smoke`

의도:
- 중앙 배포 wave와 비슷한 사고방식으로 local startup 순서를 맞춘다
- stage별 health를 확인하고 다음 단계로 넘어간다
- `seed-runner`는 startup 마지막의 별도 stage로 유지한다

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

runner 사용 시에는 아래 로그가 순서대로 보여야 한다.
- `wait for wave-2-core health`
- `wait for wave-3-domain health`
- `wait for wave-4-integration health`
- `wait for wave-5-views health`
- `wait for edge health`
- `run seed stage`
- `smoke: ...`

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
  - `ChangeMe123!`

## Current Test Flow For Driver -> Dispatch -> Settlement

현재 UI 기준 진입 순서는 이렇다.

1. `http://localhost:5174` 또는 `http://localhost:8080`에서 로그인
2. `배송원`에서 기사/배송원 데이터 확인
3. `배차 > 배차표 업로드` 이동
4. `system_admin`이면 `회사 / 플릿 / 배차일`, 일반 관리자면 `플릿 / 배차일` 선택
5. 엑셀 업로드 또는 시트 편집
6. 파일명에서 배차일이 감지되면 먼저 `감지된 날짜 적용`
7. `서버 검증`
8. `저장` 후 필요 시 `정산 시작`
9. `정산 > 정산 기준`에서 전역 설정과 회사·플릿 단가표 확인
10. `정산 > 정산 입력`에서 upload-first review 확인
11. `정산 실행`
12. `정산 결과` 조회

주의:
- `배차 계획`과 `배차표 업로드`는 현재 분리된 메뉴다
- `배차 계획`은 planning-only 화면으로 보고, 업로드 시작점은 `배차표 업로드` 메뉴로 본다
- 지원 파일명 패턴은 `YYYY-MM-DD`, `YYYY_MM_DD`, `YYYYMMDD`다
- 지원 패턴을 감지해도 바로 적용하지 않고, 사용자가 한 번 확인해야 검증이 열린다
- 형식이 맞아도 실제 달력 날짜가 아니면 자동 감지하지 않고 수동 선택으로 처리한다

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
- 업로드 메뉴 권한이 없거나, 오래된 화면 구조를 보고 있을 수 있다

조치:

1. 사이드바에서 `배차 > 배차표 업로드` 메뉴가 있는지 확인
2. 권한 정책이 바뀐 직후면 새로고침 후 다시 로그인
3. `system_admin`이 아니면 회사 선택은 숨겨지는 것이 정상

현재 기준의 업로드 시작점은 `배차 보드 상세`가 아니라 별도 `배차표 업로드` 메뉴다.

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
  -d '{"email":"seed-admin@example.com","password":"ChangeMe123!"}'
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
