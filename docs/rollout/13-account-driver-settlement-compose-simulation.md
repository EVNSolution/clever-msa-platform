# 13. Account / Driver / Settlement Compose Simulation

## 문서 목적
이 문서는 `Account / Auth`, `Driver Profile HR`, `Settlement Payroll`, `Organization Master` 경계를 로컬 `docker compose` 환경에서 실제로 시뮬레이션하는 현재 기준을 정리한다.

## 시뮬레이션 목표
- 서비스별 데이터베이스 분리가 유지되는지 확인한다.
- 도메인 간 DB 직접 접근 없이 API 경계로만 연동되는지 확인한다.
- `front`와 `admin-front`가 정본 데이터를 소유하지 않고 gateway 경유 소비자 역할만 수행하는지 확인한다.
- `seed-runner`가 서비스별 내부 `management command`만 호출하는지 확인한다.
- 이벤트 브로커 없이도 `JWT + Redis + CRUD + front/admin-front` 흐름이 성립하는지 확인한다.

## 현재 포함 서비스
- `front`
- `admin-front`
- `api-gateway`
- `organization-master-api`
- `account-auth-api`
- `driver-profile-api`
- `settlement-payroll-api`
- `settlement-ops-api`
- `seed-runner`
- `account-db`
- `driver-db`
- `settlement-db`
- `org-db`
- `redis`

## 현재 DB 토폴로지
- `account-auth-api`는 `account-db`를 사용한다.
- `driver-profile-api`는 `driver-db`를 사용한다.
- `settlement-payroll-api`는 `settlement-db`를 사용한다.
- `settlement-ops-api`는 sqlite-only runtime이다.
- `org-db`와 `redis`는 그대로 사용한다.

미래 분리 대상:
- settlement payroll 전용 DB를 따로 두는 구조
- settlement ops 전용 DB를 따로 두는 구조

## 현재 원칙
1. 서비스별 DB는 분리한다.
2. 도메인 간 DB 직접 접근은 금지한다.
3. front와 admin-front는 gateway만 바라본다.
4. `account-auth`만 Redis 기반 refresh token registry를 가진다.
5. `seed-runner`는 DB 직접 쓰기 대신 서비스 내부 command만 호출한다.
6. 이벤트 브로커와 read-model projection 저장소는 이번 스코프에 포함하지 않는다.

## gateway 경로
- `/` -> `front`
- `/admin/` -> `admin-front`
- `/api/auth/` -> `account-auth-api`
- `/api/drivers/` -> `driver-profile-api`
- `/api/settlements/` -> `settlement-payroll-api`
- `/api/settlement-ops/` -> `settlement-ops-api`
- `/api/org/` -> `organization-master-api`

## seed-runner 순서
1. `account-auth` health 확인
2. `organization-master` health 확인
3. `driver-profile` health 확인
4. `settlement-payroll` health 확인
5. `account-auth` migrate + `seed_accounts`
6. `organization-master` migrate + `seed_organization`
7. `driver-profile` migrate + `seed_drivers`
8. `settlement-payroll` migrate + `seed_settlements`

## 상태
- 현재 문서는 실제 구현된 로컬 Compose 부트스트랩 구조를 설명한다.
- 프런트 2개와 백엔드 4개가 모두 컨테이너로 포함된다.
- settlement는 write/read 서비스가 분리되어 있지만 DB는 아직 `settlement-db` 하나만 공유한다.
- `settlement-ops-api`는 sqlite-only runtime으로 동작한다.
