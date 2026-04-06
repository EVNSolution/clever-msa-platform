# 13. Account / Driver / Settlement Compose Simulation

## 문서 목적
이 문서는 `Account / Auth`, `Driver Profile HR`, `Settlement Payroll`, `Settlement Operations View`, `Driver 360`, `Organization Master` 경계를 로컬 `docker compose` 환경에서 settlement split 관점으로 시뮬레이션하는 현재 기준을 정리한다.

전체 local-stack inventory와 최종 compose 정본은 아래 문서를 따른다.
- `../../development/integration-local-stack/README.md`
- `../../development/integration-local-stack/docker-compose.account-driver-settlement.yml`

## 시뮬레이션 목표
- 서비스별 데이터베이스 분리가 유지되는지 확인한다.
- 도메인 간 DB 직접 접근 없이 API 경계로만 연동되는지 확인한다.
- 단일 웹 콘솔(`admin-front`)이 정본 데이터를 소유하지 않고 gateway 경유 소비자 역할만 수행하는지 확인한다.
- `seed-runner`가 서비스별 내부 `management command`만 호출하는지 확인한다.
- 이벤트 브로커 없이도 `JWT + Redis + CRUD + admin-front` 흐름이 성립하는지 확인한다.

## settlement split 검증에 직접 관련된 서비스
- `admin-front`
- `gateway`
- `organization-master-api`
- `account-auth-api`
- `driver-profile-api`
- `settlement-payroll-api`
- `settlement-ops-api`
- `driver-ops-api`
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
3. 단일 웹 콘솔(`admin-front`)은 gateway만 바라본다.
4. `account-auth`만 Redis 기반 refresh token registry를 가진다.
5. `seed-runner`는 DB 직접 쓰기 대신 서비스 내부 command만 호출한다.
6. 이벤트 브로커와 read-model projection 저장소는 이번 스코프에 포함하지 않는다.

## gateway 경로
- `/` -> `admin-front`
- `/api/auth/` -> `account-auth-api`
- `/api/drivers/` -> `driver-profile-api`
- `/api/settlements/` -> `settlement-payroll-api`
- `/api/settlement-ops/` -> `settlement-ops-api`
- `/api/driver-ops/` -> `driver-ops-api`
- `/api/org/` -> `organization-master-api`

## seed-runner에서 settlement split과 직접 관련된 순서
전체 순서는 `integration-local-stack/infra/docker/seed-runner/run-seed.sh`를 따른다.

관련 구간만 적으면 아래와 같다.
1. `organization-master` health 확인
2. `driver-profile` health 확인
3. `settlement-payroll` health 확인
4. `organization-master` migrate + `seed_organization`
5. `driver-profile` migrate + `seed_drivers`
6. `settlement-payroll` migrate + `seed_settlements`

## 상태
- 현재 문서는 전체 local-stack inventory가 아니라 settlement split 검증에 직접 관련된 현재 slice를 설명한다.
- 단일 웹 콘솔과 백엔드 6개가 모두 컨테이너로 포함된다.
- settlement는 write/read 서비스가 분리되어 있지만 DB는 아직 `settlement-db` 하나만 공유한다.
- `settlement-ops-api`는 sqlite-only runtime으로 동작한다.

## settlement scoped read smoke
- `GET /api/settlement-ops/drivers/<driver_id>/latest-settlement/`는 `driver_id`와 `latest_settlement` wrapper를 반환해야 한다.
- settlement 이력이 없는 `driver_id`는 `200`과 `latest_settlement: null`을 반환해야 한다.
- `GET /api/driver-ops/drivers/<driver_id>/`는 계속 같은 outer summary contract를 유지해야 하며, latest settlement 필드는 scoped settlement read contract에서 채워져야 한다.
