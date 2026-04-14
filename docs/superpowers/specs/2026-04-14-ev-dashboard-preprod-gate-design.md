# ev-dashboard Temporary Pre-Prod Gate Design

## Goal

`ev-dashboard` release에서 prod 직전 한 단계의 명시적 검증 게이트를 두되, 상시 candidate 환경이나 snapshot clone DB 비용 없이 운영 가능한 기본 구조를 고정한다.

## Decision Summary

`ev-dashboard`의 기본 release 흐름은 아래로 고정한다.

```text
build immutable images once
-> deploy same SHA to temporary pre-prod ECS lane
-> run candidate smoke
-> release same SHA to prod
-> tear down temporary lane
```

이 문서에서 말하는 `pre-prod`는 상시 환경 이름이 아니다. release 직전에만 잠깐 살아 있는 `temporary ECS lane`이다.

## Why This Exists

현재 구조는 prod ECS stack에 바로 deploy한 뒤 smoke를 확인한다. 이 방식은 비용은 싸지만, prod가 첫 검증 지점이 된다.

반대로 full candidate 환경을 상시로 두고 prod DB clone까지 같이 두면 아래 비용이 커진다.

- ALB
- Fargate tasks
- RDS instances
- Redis
- logs and transfer

이번 결정은 아래 두 요구를 동시에 만족하려는 절충안이다.

1. prod 전에 한 단계는 있어야 한다.
2. 상시 candidate + snapshot clone DB 비용은 피하고 싶다.

## Why We Reject Table-Level Dummy Flags

테스트용 더미를 숨기기 위해 `Company`, `Fleet` 같은 정본 테이블에 `is_test_fixture` 같은 컬럼을 넣는 방향은 기본 전략으로 채택하지 않는다.

이유는 아래다.

- 정본 모델이 운영 정책 때문에 오염된다.
- public lookup, protected list, read model, frontend 모두 같은 숨김 규칙을 공유해야 한다.
- 규칙 누락 시 더미가 다시 노출된다.

즉 더미 노출 문제는 데이터 모델 확장보다 ingress와 release 절차 분리로 푸는 쪽이 맞다.

## Chosen Pre-Prod Shape

### Runtime

- 같은 AWS account
- 같은 region `ap-northeast-2`
- 별도 temporary ECS/Fargate stack
- 검증 끝나면 destroy 또는 scale-down

### Ingress

- 기본값은 짧은 수명 subdomain
- 예:
  - `candidate.ev-dashboard.com`
  - `api.candidate.ev-dashboard.com`

이 subdomain은 기존 hosted zone 안에 alias record로만 추가한다. 별도 hosted zone을 만들지 않는다.

### Artifact Policy

- image는 한 번만 build한다.
- image tag는 immutable SHA만 사용한다.
- pre-prod와 prod는 같은 image URI를 사용한다.
- pre-prod 통과 후 prod release에서 rebuild하지 않는다.

즉 `pre-prod`는 build 단계가 아니라 release candidate 검증 단계다.

## Data Policy

### Default Low-Cost Mode

기본값은 별도 snapshot clone DB를 만들지 않는 low-cost mode다.

- pre-prod lane은 prod와 같은 데이터 계층을 공유할 수 있다.
- 하지만 이 경우 허용되는 검증은 아래로 제한한다.
  - read-only smoke
  - 좁고 가역적인 reversible write smoke

### Allowed In Shared-Data Mode

- login/session 확인
- docs/admin/auth health 확인
- read-only browser smoke
- 작은 생성 후 즉시 삭제가 가능한 reversible write

### Forbidden In Shared-Data Mode

- 장기 잔존이 필요한 더미 row 생성
- 대량 seed
- 외부 side effect가 있는 flow
  - mail
  - SMS
  - webhook
  - telemetry publish
- fan-out이 큰 workflow
  - dispatch execution
  - settlement execution
  - notification blast

## Critical Constraint: Migrations

현재 Django 서비스들은 startup에서 migration을 수행하는 계약을 가진다. 따라서 temporary pre-prod lane이 prod RDS를 공유하는 상태에서 새 image를 띄우면, migration이 prod schema에 먼저 적용될 수 있다.

이 뜻은 중요하다.

- `shared-data pre-prod`는 모든 release에 무조건 쓸 수 있는 기본값이 아니다.
- DB migration 또는 schema-sensitive release에서는 이 pre-prod가 완전한 격리 검증이 아니다.

### Rule

아래 중 하나라도 참이면, low-cost shared-data pre-prod를 그대로 쓰지 않는다.

- migration file이 포함됨
- startup migration behavior가 바뀜
- schema compatibility가 불명확함
- irreversible write path를 검증해야 함

이 경우 선택지는 둘이다.

1. cloned DB를 쓰는 higher-cost pre-prod lane으로 올린다.
2. pre-prod 범위를 read-only proof로 줄이고, migration release는 별도 승인과 runbook으로 다룬다.

즉 비용 절감형 pre-prod는 `schema-compatible release`에 가장 잘 맞는다.

## Cost Model

### Added Cost

기본 low-cost pre-prod는 아래만 추가된다.

- temporary ALB
- temporary Fargate tasks
- short-lived Route53 alias records
- short-lived CloudWatch logs

### Not Added By Default

- extra hosted zone
- dedicated long-lived candidate environment
- snapshot restore DB
- extra Redis cluster

즉 “prod 전에 한 단계”라는 요구를 만족하는 구조 중에서는 현재 가장 싼 편이다.

## Release Levels

### Level 1. Artifact

- service repo build
- ECR push
- immutable SHA fixed

### Level 2. Pre-Prod Gate

- temporary ECS lane deploy
- short-lived candidate subdomain attach
- candidate smoke
- lane teardown or scale-down

### Level 3. Prod Release

- same SHA image deploy
- prod smoke

## Operational Default

앞으로 `ev-dashboard`에서 별도 지시가 없으면 아래를 기본값으로 본다.

1. build once
2. temporary pre-prod lane with short-lived subdomain
3. no snapshot clone DB by default
4. shared-data mode means read-only and narrow reversible write only
5. migration-bearing release is not honest proof in shared-data mode

## What This Decision Does Not Solve

이 결정만으로 prod 데이터 안의 테스트 계정이나 더미 row가 자동으로 숨겨지지는 않는다.

이 설계의 목적은:

- prod 전에 한 단계 두기
- 비용을 낮추기
- same artifact promotion을 가능하게 하기

장기적인 test data isolation까지 원하면 별도 cloned DB lane이 여전히 필요하다.
