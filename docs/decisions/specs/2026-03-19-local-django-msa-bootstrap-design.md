# 로컬 Django MSA 부트스트랩 디자인

## 목적

이 문서는 현재 `MSA-Server` 디렉토리 안에서 실제로 기동 가능한 로컬 MSA 부트스트랩 환경을 만들기 위한 설계 문서다.

이번 설계의 목표는 문서 저장소 수준을 넘어, `Account / Auth`, `Driver Profile HR`, `Settlement Payroll`, `Organization Master`, `Vehicle Asset`를 완전 독립 Django/DRF 프로젝트로 나누고, `api-gateway`, `front`, `admin-front`까지 포함한 로컬 개발 플랫폼을 Docker로 실제 실행 가능하게 만드는 것이다.

현재 유지할 도메인 범위는 아래처럼 더 좁혀서 고정한다.

- `Organization Master`: `Company`, `Fleet`만
- `Driver Profile HR`: 기사 기본정보만
- `Settlement Payroll`: generic `run/item` scaffold만 유지하고 legacy 계산 동작은 구현하지 않음
- `Vehicle Asset`: 차량 자산 정본만 유지하고 `current_driver_id`, `terminal_id`, 운영성 상태는 구현하지 않음

이 문서는 구현 계획이 아니라, 폴더 구조와 서비스 책임, 인증 흐름, 게이트웨이 진입 구조, 프런트 범위를 먼저 고정해 이후 구현이 흔들리지 않게 만드는 설계 문서다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. 현재 디렉토리 안에 독립 프로젝트 디렉토리 생성
2. Django/DRF 기반 백엔드 서비스 5개 생성
3. React/Vite 기반 프런트 앱 2개 생성
4. Nginx 기반 API gateway 구성
5. Postgres 서비스별 DB 분리
6. Redis 기반 토큰/세션 보조 저장소 구성
7. JWT 기반 실제 로그인, 재발급, 로그아웃 흐름
8. 서비스별 최소 CRUD API와 프런트 실제 호출
9. Compose 기반 전체 로컬 기동
10. seed 데이터와 healthcheck 기준 정의

## 비스코프

이번 1차 구현에서 일부러 제외하는 것은 아래와 같다.

1. 이벤트 브로커
2. 비동기 워커와 배치 큐
3. read model 전용 projection 저장소
4. 세밀한 RBAC와 조직별 세부 권한 정책
5. SSO, 소셜 로그인, 외부 IdP 연동
6. 파일 업로드
7. observability stack
8. CI/CD
9. 실서비스 배포용 인프라 설정

## 선택된 접근

사용자가 승인한 접근은 아래와 같다.

1. 완전 독립 Django 프로젝트 5개
2. `account-auth`만 Redis를 사용해 refresh token registry와 최소 로그인 메타데이터를 관리
3. 다른 서비스는 JWT를 검증만 하고 자기 DB만 사용
4. `front`, `admin-front`는 gateway만 바라보는 React/Vite 독립 앱 2개
5. 로컬 개발은 Docker Compose 기반으로 통합 기동

이 접근의 의미는 코드 공유보다 서비스 독립성을 우선하는 것이다. 공통 Python 패키지를 따로 두지 않고, 서비스 간 공통 계약은 `env 이름`, `JWT claim`, `HTTP path`, `health endpoint`로만 맞춘다.

## 디렉토리 구조

루트 아래에 아래 구조를 만든다.

```text
services/
  account-auth/
  driver-profile/
  settlement/
  organization-master/
  vehicle-asset/
gateway/
front/
admin-front/
infra/
  docker/
  env/
```

### 백엔드 서비스 구조

각 서비스는 완전 독립 Django/DRF 프로젝트다.

예시 구조:

```text
services/account-auth/
  manage.py
  requirements.txt
  Dockerfile
  .env.example
  config/
    settings.py
    urls.py
    wsgi.py
  accounts/
    models.py
    serializers.py
    views.py
    urls.py
```

같은 원칙을 `driver-profile`, `settlement`, `organization-master`, `vehicle-asset`에 반복 적용한다.

### 프런트 구조

`front`와 `admin-front`는 각각 독립 Vite 프로젝트다.

예시 구조:

```text
front/
  package.json
  vite.config.ts
  src/
    app/
    pages/
    api/
    components/
```

`admin-front`도 같은 방식으로 별도 구성한다.

## 서비스별 최소 책임과 CRUD 범위

### 1. Organization Master

역할:

- 회사와 플릿 기준정보 정본

최소 모델:

- `Company`
- `Fleet`

최소 필드:

- `Company`
  - `company_id`
  - `name`
- `Fleet`
  - `fleet_id`
  - `company_id`
  - `name`

최소 API:

- 회사 CRUD
- 플릿 CRUD
- `/health/`

### 2. Account / Auth

역할:

- 로그인 주체, 자격, 토큰, 계정 상태 관리

최소 모델:

- `Account`

최소 필드:

- `account_id`
- `email`
- `password_hash`
- `role`
- `is_active`

최소 API:

- 회원 생성
- 로그인
- refresh
- logout
- 내 정보 조회
- 계정 CRUD
- `/health/`

Redis 사용:

- refresh token 저장
- active refresh session registry
- 최근 로그인 메타데이터(`last_login_at`, `active_session_count`) 수준의 최소 상태

### 3. Driver Profile HR

역할:

- 기사 기본 프로필 정본

최소 모델:

- `DriverProfile`

최소 필드:

- `driver_id`
- `account_id` (optional)
- `company_id`
- `fleet_id`
- `name`
- `ev_id`
- `phone_number`
- `address`

최소 API:

- 기사 CRUD
- EV ID 중복검사
- `/health/`

### 4. Settlement Payroll

역할:

- 정산 실행과 결과 항목을 담는 placeholder 정본

최소 모델:

- `SettlementRun`
- `SettlementItem`

최소 필드:

- `SettlementRun`
  - `settlement_run_id`
  - `company_id`
  - `fleet_id`
  - `period_start`
  - `period_end`
  - `status`
- `SettlementItem`
  - `settlement_item_id`
  - `settlement_run_id`
  - `driver_id`
  - `amount`
  - `payout_status`

최소 API:

- 정산 실행 CRUD
- 정산 항목 CRUD
- `/health/`

명시적 비포함:

- `SettlementPolicy`
- `SystemConfig`
- `DailySettlement`, `MonthlySettlement`, `GroupSettlement`
- 세율, 보험료율, 공제/정산 계산 공식

### 5. Vehicle Asset

역할:

- 차량 자산 정본

최소 모델:

- `Vehicle`

최소 필드:

- `vehicle_id`
- `company_id`
- `fleet_id` (optional)
- `plate_number`
- `vin`
- `vehicle_status`

최소 API:

- 차량 CRUD
- `/health/`

명시적 비포함:

- `current_driver_id`
- `terminal_id`
- `handover_status`
- `telemetry_health_status`
- `maintenance_flag`
- `accident_flag`

## 공통 데이터 원칙

1. 각 서비스는 자기 DB만 사용한다.
2. 다른 서비스 DB join은 금지한다.
3. 참조 데이터는 외래키 대신 외부 식별자 UUID 문자열로 가진다.
4. `account_id`와 `driver_id`는 합치지 않는다.
5. `company_id`, `fleet_id`는 Organization Master 정본 기준으로만 참조한다.
6. `account_id`, `driver_id`, `company_id`, `fleet_id`, `settlement_run_id`, `settlement_item_id`, JWT `sub`는 모두 UUID 문자열 규칙으로 통일한다.
7. cross-service seed 데이터는 독립 하드코딩 UUID를 제각각 만들지 않고, 선행 seed 결과를 deterministic lookup 또는 공유 seed 식별자 규칙으로 재사용한다.

## 인증과 토큰 흐름

### 로그인

1. `front` 또는 `admin-front`가 `/api/auth/login/` 호출
2. `account-auth`가 access token과 refresh token 발급
3. refresh token은 Redis에 저장하고 `HttpOnly cookie`로 내려보낸다.
4. access token은 response body로 내려보내고 프런트는 메모리 기준으로만 저장한다.
5. 이후 API 호출은 Bearer access token으로 전달한다.

refresh cookie 규칙:

- `HttpOnly`
- `Path=/api/auth/`
- `SameSite=Lax`
- 로컬 개발 기준 `Secure=false`

### 재발급

1. 프런트가 `withCredentials`로 `/api/auth/refresh/` 호출
2. `account-auth`가 Redis 기준으로 refresh token 유효성 확인
3. 정상이면 새 access token 발급
4. 필요 시 refresh token rotation을 수행하고 새 cookie로 교체한다.

### 로그아웃

1. 프런트가 `/api/auth/logout/` 호출
2. `account-auth`가 Redis에서 refresh token registry를 제거한다.
3. 이번 1차 범위에서는 refresh token만 폐기하고, 이미 발급된 access token은 만료 시점까지 유효하게 둔다.

### 다른 서비스의 인증 처리

`driver-profile`, `settlement`, `organization-master`는 아래 방식으로만 인증을 처리한다.

1. `HS256` 서명 검증
2. 공통 env(`JWT_SECRET_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ALGORITHM`) 기준 검증
3. `iss`, `aud`, `exp` 검증
4. `sub == account_id` 규칙과 기본 role claim 해석

다른 서비스는 매 요청마다 `account-auth`에서 계정 상세를 조회하지 않는다.
다른 서비스는 access token blacklist나 전역 로그아웃 상태를 조회하지 않는다.

### JWT 최소 claim

- `sub` (`account_id`)
- `email`
- `role`
- `iss`
- `aud`
- `exp`
- `iat`
- `jti`

## 최소 권한 매트릭스

이번 1차 범위에서는 role을 두 개만 둔다.

- `admin`
- `user`

접근 규칙:

- `admin-front`의 조직 CRUD, 계정 CRUD, 정산 CRUD는 `admin`만 가능
- `front`의 일반 조회와 기사 CRUD 데모 흐름은 인증된 `user`와 `admin` 모두 가능
- `organization-master`, `settlement`, `account-auth`의 관리성 쓰기 API는 `admin`만 가능
- `driver-profile`의 기사 CRUD는 1차 데모 범위에서 인증된 `user`와 `admin` 모두 가능

## Gateway 구조

로컬 진입점은 `api-gateway` 하나로 고정한다.

경로 구조는 아래와 같다.

- `/` -> `front`
- `/admin/` -> `admin-front`
- `/api/auth/` -> `account-auth`
- `/api/drivers/` -> `driver-profile`
- `/api/settlements/` -> `settlement`
- `/api/org/` -> `organization-master`
- `/api/vehicles/` -> `vehicle-asset`

gateway는 인증 정본이 아니라 라우팅 경계만 담당한다. 백엔드 에러는 상태코드와 JSON 본문을 유지한 채 전달한다.

## Front / Admin Front 범위

### Front

최소 화면:

- 로그인
- 내 계정 요약
- 회사/플릿 조회
- 기사 기본정보 목록/등록/수정
- 정산 실행/항목 조회
- settlement placeholder 안내 문구

### Admin Front

최소 화면:

- 계정 목록/생성/수정
- 회사/플릿 CRUD
- 기사 기본정보 CRUD
- 정산 실행 CRUD
- 정산 항목 CRUD

공통 원칙:

1. 두 프런트 모두 gateway만 호출한다.
2. 서비스 컨테이너를 직접 호출하지 않는다.
3. 토큰 만료 시 refresh 후 재시도, 실패 시 로그인 화면으로 복귀한다.
4. refresh 호출은 cookie 기반이므로 `withCredentials`를 사용한다.

## Docker Compose 토폴로지

포함 컨테이너:

- `gateway`
- `front`
- `admin-front`
- `account-auth-api`
- `driver-profile-api`
- `settlement-api`
- `organization-master-api`
- `vehicle-asset-api`
- `redis`
- `seed-runner`
- `account-db`
- `driver-db`
- `settlement-db`
- `org-db`
- `vehicle-db`

운영 원칙:

1. 백엔드는 Django dev server로 시작한다.
2. 프런트는 Vite dev server로 시작한다.
3. gateway는 Nginx reverse proxy다.
4. 소스 볼륨을 마운트해 로컬 수정이 즉시 반영되게 한다.
5. DB와 Redis는 named volume을 사용한다.

## Seed와 초기 상태

로컬 실행 직후 최소한 아래 데이터가 있어야 한다.

seed 정책은 아래와 같이 고정한다.

1. `seed-runner` 컨테이너가 `docker compose up` 시 자동 실행된다.
2. `seed-runner`는 대상 DB와 `account-auth`가 준비된 뒤 실행된다.
3. seed는 natural key 또는 upsert 기준으로 idempotent하게 작성한다.
4. 재실행해도 중복 데이터가 쌓이지 않아야 한다.
5. 실패 시 `seed-runner` 로그로 원인을 확인할 수 있어야 한다.
6. `seed-runner`는 각 서비스 DB에 직접 쓰지 않고, 서비스별 내부 `management command`를 순서대로 호출한다.
7. 기본 admin 로그인 자격은 `.env`의 `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`로 주입한다.
8. `driver-profile`, `vehicle-asset`, `settlement` seed는 `organization-master` seed와 독립된 임의 UUID를 쓰지 않고, seeded company/fleet와 seeded driver를 조회해 참조를 맞춘다.

1. 기본 admin 계정 1개
2. 회사 1개
3. 플릿 1개
4. 기사 샘플 1~2건
5. 차량 샘플 1건
6. 정산 실행 샘플 1건
7. 정산 항목 샘플 1세트

## 에러 처리 규칙

모든 백엔드는 최소한 아래 JSON 형식을 사용한다.

```json
{
  "code": "string",
  "message": "string",
  "details": {}
}
```

상태코드는 아래 기준으로 고정한다.

- `400`: 유효성 오류
- `401`: 인증 실패
- `403`: 권한 부족
- `404`: 미존재
- `500`: 서버 오류

## 검증 기준

이번 1차 구현의 완료 기준은 아래와 같다.

1. `docker compose up`으로 전체 서비스가 기동한다.
2. 각 백엔드 서비스의 `/health/`가 응답한다.
3. `account-auth`의 회원 생성, 로그인, refresh, logout이 동작한다.
4. `front`, `admin-front`가 gateway를 통해 실제 CRUD API를 호출한다.
5. `seed-runner`가 자동 실행되고 seed 데이터가 기본 화면과 API에서 확인된다.

## 구현 원칙

1. 코드 공유보다 서비스 독립성을 우선한다.
2. 공용 base Django 프로젝트는 만들지 않는다.
3. 최소 CRUD를 넘는 세부 기능은 1차 구현에 넣지 않는다.
4. auth를 gateway에 몰지 않고 `account-auth`가 정본을 가진다.
5. 이후 실제 repo 분리를 고려해 디렉토리 단위 이동이 가능해야 한다.

## 설계 결과

이번 설계는 현재 `MSA-Server` 디렉토리를 문서 저장소에서 로컬 실행형 MSA 작업공간으로 확장하는 기준선이다.

즉, 다음 단계 구현은 아래를 만들어야 한다.

1. 독립 Django/DRF 서비스 4개
2. 독립 React/Vite 앱 2개
3. Nginx gateway
4. Postgres 4개와 Redis 1개
5. JWT + refresh token registry + cookie 기반 refresh 동작
6. 서비스별 최소 CRUD와 실제 프런트 호출
