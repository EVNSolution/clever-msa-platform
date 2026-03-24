# Settlement Registry Phase 1 Activation 디자인

## 목적

이 문서는 `service-settlement-registry`를 empty shell에서 1차 runtime으로 승격하기 위한 경계와 최소 구현 범위를 고정한다.

이번 설계의 목표는 아래와 같다.

1. `service-settlement-registry`를 이름 규칙에 맞는 pure registry runtime으로 활성화한다.
2. settlement 정책, 정책 버전, 적용 스코프를 결과 write 영역과 분리한다.
3. `service-settlement-payroll`과 `service-settlement-operations-view`의 책임을 침범하지 않는 최소 CRUD 범위를 고정한다.
4. compose, gateway, seed, repo 문서가 shell 상태가 아닌 active runtime 상태를 반영하도록 기준을 만든다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-settlement-registry` 1차 runtime의 역할 정의
2. 정책 엔티티 3종의 ownership과 관계 정의
3. 외부 route, compose service naming, auth 기준 정의
4. local seed와 최소 검증 기준 정의
5. 문서와 인덱스 반영 기준 정의

## 비스코프

이번 설계에서는 아래 항목을 다루지 않는다.

1. 정산 계산 엔진
2. `SettlementRun`, `SettlementItem`, `deduction`, `incentive`, `payout_status`
3. payroll direct integration
4. effective policy lookup helper
5. bulk import
6. rule simulation, dry-run, precedence simulator
7. 배송원 단위 override

## 현재 상태

현재 settlement 4축은 아래 상태다.

1. `service-settlement-payroll`은 정산 결과 write owner runtime이다.
2. `service-settlement-operations-view`는 read-only runtime이다.
3. `service-settlement-registry`는 shell만 있고 runtime, migration, API, seed가 없다.
4. `service-delivery-record`도 shell 상태라 source input truth는 아직 활성화되지 않았다.

문서상 경계는 이미 고정돼 있다.

1. `service-settlement-registry`는 정책, 기준, 버전, 적용기간 registry다.
2. 결과 엔티티와 payout 상태는 이 repo가 절대 소유하지 않는다.
3. 지금 필요한 것은 계산 기능이 아니라 shell 제거와 경계 안정화다.

## 선택된 접근

이번 설계에서는 아래 접근을 선택한다.

1. `service-settlement-registry`는 pure registry CRUD만 구현한다.
2. 1차 엔티티는 `SettlementPolicy`, `SettlementPolicyVersion`, `SettlementPolicyAssignment`로 제한한다.
3. assignment scope는 `company_id + fleet_id` 쌍으로 고정한다.
4. `driver_id` override와 company-only precedence는 다음 라운드로 미룬다.
5. 모든 write와 read API는 admin-authenticated management API로 시작한다.
6. payroll, ops-view consumer는 이번 라운드에서 직접 연동하지 않는다.

이 접근을 선택한 이유는 아래와 같다.

1. registry 이름과 가장 잘 맞는다.
2. 결과 write owner와 계산 책임이 섞이지 않는다.
3. shell 제거에 필요한 최소 runtime만 올릴 수 있다.
4. 후속 `service-delivery-record` 활성화와 payroll lookup 연동을 별도 배치로 유지할 수 있다.

## 서비스 경계

### `service-settlement-registry`가 직접 소유하는 것

1. settlement policy 마스터
2. policy version 이력
3. 회사/플릿 기준 policy assignment
4. 해당 엔티티의 CRUD와 read API

### `service-settlement-registry`가 소유하지 않는 것

1. `SettlementRun`
2. `SettlementItem`
3. `deduction`
4. `incentive`
5. `payout_status`
6. delivery source input truth
7. settlement read-model summary
8. policy simulation 또는 계산 실행

## 엔티티 구조

### 1. `SettlementPolicy`

역할:

1. 정책의 상위 식별자
2. 운영 식별과 lifecycle 상태를 가진다

최소 필드 방향:

1. `policy_id`
2. `policy_code`
3. `name`
4. `status`
5. `description`

주의:

1. 여기에는 계산 결과가 없다.
2. 실제 계산 기준은 version 아래에 있다.

### 2. `SettlementPolicyVersion`

역할:

1. 실제 계산 기준이 되는 버전 단위
2. 특정 policy의 immutable version snapshot

최소 필드 방향:

1. `policy_version_id`
2. `policy_id`
3. `version_number`
4. `rule_payload`
5. `status`
6. `published_at`

`rule_payload` 방향:

1. 정규화된 다중 테이블보다 1차에서는 JSON payload를 허용한다.
2. base rate, incentive rule, deduction rule 같은 기준값 묶음을 담는다.
3. 계산 로직은 담지 않고 계산 기준값만 담는다.

### 3. `SettlementPolicyAssignment`

역할:

1. 어떤 조직 스코프에 어떤 policy version이 적용되는지 기록한다.

최소 필드 방향:

1. `assignment_id`
2. `policy_version_id`
3. `company_id`
4. `fleet_id`
5. `effective_start_date`
6. `effective_end_date`
7. `status`

스코프 규칙:

1. 1차에서는 `company_id`와 `fleet_id`를 모두 요구한다.
2. company-only assignment는 2차 이후 과제로 미룬다.
3. `driver_id` override는 넣지 않는다.
4. 같은 `company_id + fleet_id` 조합에 대해 같은 기간의 active assignment 중복은 금지한다.

조직 참조 규칙:

1. `company_id`와 `fleet_id`는 `service-organization-registry`가 소유하는 reference key다.
2. `service-settlement-registry`는 조직 정본을 복제하거나 소유하지 않는다.
3. assignment 생성/수정 시 대상 `company_id`, `fleet_id`의 존재 여부와 소속 관계는 `service-organization-registry` 기준으로 검증한다.

assignment invariant:

1. assignment는 `published` 상태의 `SettlementPolicyVersion`만 가리킬 수 있다.
2. `effective_end_date`는 nullable open-ended를 허용한다.
3. 기간 규칙은 `effective_start_date <= target_date < effective_end_date` 반열린 구간으로 해석한다.
4. `effective_end_date`가 null이면 종료 없는 active assignment로 본다.
5. 같은 `company_id + fleet_id` 조합에 대해 같은 시점에 유효한 active assignment는 하나만 허용한다.

## API / Service Naming

1차 naming은 아래로 고정한다.

1. compose service: `settlement-registry-api`
2. gateway prefix: `/api/settlement-registry/`

최소 API shape는 아래와 같다.

1. `GET /api/settlement-registry/health/`
2. `GET/POST /api/settlement-registry/policies/`
3. `GET/PATCH /api/settlement-registry/policies/{policy_id}/`
4. `GET/POST /api/settlement-registry/policy-versions/`
5. `GET/PATCH /api/settlement-registry/policy-versions/{policy_version_id}/`
6. `GET/POST /api/settlement-registry/policy-assignments/`
7. `GET/PATCH /api/settlement-registry/policy-assignments/{assignment_id}/`

원칙:

1. delete는 1차에서 hard delete보다 status 기반 비활성화를 우선한다.
2. assignment는 기간 중복 검증을 포함한다.
3. read-model query API처럼 별도 summary endpoint를 추가하지 않는다.

## Auth / Permission 기준

1차 auth 기준은 아래와 같다.

1. `health`만 공개
2. CRUD API는 admin-authenticated management API
3. payroll 같은 내부 consumer를 위한 별도 machine-auth는 이번 라운드에 포함하지 않는다

선택 이유:

1. 현재는 shell 제거와 경계 안정화가 목적이다.
2. internal consumer auth까지 같이 열면 scope가 커진다.

## Seed 기준

1차 seed는 최소 1세트를 제공한다.

포함:

1. 예시 `SettlementPolicy` 1건 이상
2. 해당 policy의 version 1건 이상
3. seeded `company_id + fleet_id`에 대한 assignment 1건 이상

원칙:

1. integration-local-stack의 seeded organization 식별자를 재사용한다.
2. seed는 registry 역할을 보여 주는 최소 예시만 넣는다.
3. 결과 데이터나 payroll 데이터는 넣지 않는다.

## 통합 영향

이번 1차 활성화에서 필요한 통합 반영은 아래와 같다.

1. `development/integration-local-stack/` compose에 `settlement-registry-api` 추가
2. `development/edge-api-gateway/`에 `/api/settlement-registry/` route 추가
3. current runtime inventory에서 `service-settlement-registry`를 active runtime으로 승격
4. repo map과 responsibility matrix에서 shell 설명을 runtime 설명으로 갱신

이번 라운드에서 하지 않는 것:

1. `service-settlement-payroll`의 direct lookup 연동
2. `service-settlement-operations-view` fan-out 연동
3. `service-delivery-record` 활성화

## 문서 반영 원칙

최소한 아래 문서가 같이 갱신돼야 한다.

1. `WORKSPACE.md`
2. `repo-map.md`
3. `docs/mappings/current-to-target-repo-map.md`
3. `docs/mappings/current-runtime-inventory.md`
4. `docs/mappings/repo-responsibility-matrix.md`
5. `development/service-settlement-registry/README.md`
6. compose / gateway 관련 local stack 문서

`docs/mappings/current-to-target-repo-map.md` 반영 기준:

1. `service-settlement-registry`의 current source 설명에서 empty shell 문구를 제거한다.
2. status는 runtime 활성화 이후 상태로 갱신한다.
3. settlement 4축 안에서 정책 registry runtime이 올라왔음을 명시한다.

핵심 반영 내용:

1. `service-settlement-registry`는 더 이상 empty shell이 아니다.
2. 정책/기준/버전/적용기간 registry라는 경계를 유지한다.
3. 결과 write owner는 여전히 `service-settlement-payroll`이다.
4. `company_id`, `fleet_id` 참조는 `service-organization-registry` 정본을 따른다.

## 검증 기준

최소 검증 범위는 아래와 같다.

1. `service-settlement-registry` 단위 테스트 통과
2. local stack compose config 통과
3. gateway health 및 CRUD smoke 통과
4. seed command 통과
5. `current-runtime-inventory.md`에서 `service-settlement-registry`가 active runtime으로 보인다

## 완료 기준

이번 설계가 구현으로 내려갈 준비가 됐다고 보는 기준은 아래와 같다.

1. `service-settlement-registry`가 pure registry runtime으로 정의된다.
2. 결과 엔티티가 이 repo 범위 밖에 남는 것이 문서상 명확하다.
3. assignment scope가 `company_id + fleet_id`로 고정된다.
4. route와 compose naming이 고정된다.
5. shell 제거를 위한 최소 runtime 범위가 구현 계획으로 바로 내려갈 수 있다.
