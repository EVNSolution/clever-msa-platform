# CLEVER MSA Platform Workspace

이 워크스페이스는 `CLEVER` 안의 다른 프로젝트와 분리된 `MSA 전환 플랫폼 셸`이다.

목적은 두 가지다.
- 설계와 매핑의 정본을 `docs/`에 고정한다.
- 실제 구현은 `development/` 아래의 root-tracked source slice로 통합 관리한다.

이 루트는 플랫폼 monorepo umbrella다. 서비스 구현 코드는 `development/*` 아래에서 root repo가 직접 추적한다.

`AGENTS.md`와 각 repo의 `README.md`는 운영 안내 문서다. 정본은 `docs/`와 root mapping 문서에만 둔다.

## Top-Level Structure

```text
clever-msa-platform/
├── WORKSPACE.md
├── repo-map.md
├── docs/
│   ├── goals/
│   ├── boundaries/
│   ├── mappings/
│   ├── contracts/
│   ├── decisions/
│   ├── rollout/
│   └── archive/
│       ├── superseded/
│       ├── historical/
│       └── rejected/
└── development/
```

## What `docs/` Owns

`docs/`는 이 플랫폼의 문서 정본이다.

- `goals/`
  - 플랫폼의 목표 상태와 상위 방향
- `boundaries/`
  - 서비스 경계, 소유 데이터, join risk
- `mappings/`
  - 현재 구조에서 목표 구조로 가는 이동표, legacy cut map, source index, current runtime inventory
- `contracts/`
  - ID, 상태, read model contract, integration rule
- `decisions/`
  - 왜 이런 경계를 택했는지에 대한 결정 기록과 spec
- `rollout/`
  - living rollout docs와 active plan only 영역
- `archive/`
  - 더 이상 정본이 아닌 문서만 보관, completed rollout artifact 포함

`docs/`에는 실행 코드, compose, env, seed script를 두지 않는다.

## What `development/` Owns

`development/` 아래는 실제 구현 source slice 묶음이다.

원칙:
- 각 디렉토리는 독립 배포/소유 경계를 가진 source slice다.
- root repo가 whitelist에 포함된 `development/*` 파일을 직접 추적한다.
- 서비스는 다른 서비스 내부 구현을 import하지 않는다.
- 공유 코드는 기본 금지다.
- cross-service 연결은 계약 문서와 API 기준으로만 관리한다.

로컬 clone/update 규칙:
- 루트를 새로 clone하면 `development/*` 구현 코드가 root checkout에 같이 포함된다.
- root pull 이후 별도 `git submodule update` 절차는 없다.
- 구현 코드는 root worktree의 해당 `development/*` slice에서 수정한다.
- root는 platform docs와 runtime source를 함께 추적하지만, 서비스 경계는 docs/contracts 기준으로 유지한다.

현재 목표 repo 이름 규칙:
- `integration-*`
  - 로컬 통합 실행 셸
- `infra-*`
  - 특정 runtime slice의 ALB, ECS, Route53, CDK deploy를 소유하는 전용 infra repo
- `runtime-*`
  - production runtime release control plane 또는 runtime shape owner
- `edge-*`
  - gateway, edge routing
- `front-*`
  - 사용자 UI
- `service-*`
  - 백엔드 서비스

역할 suffix 규칙:
- `access`
- `profile`
- `registry`
- `assignment`
- `operations-view`
- `hub`
- `listener`
- `dead-letter`

## Root Development Slice Whitelist

현재 root monorepo와 `development/` tree에서 유지하는 필수 source slice는 아래와 같다.

- `runtime-prod-release`
- `runtime-prod-platform`
- `edge-api-gateway`
- `front-web-console`
- `front-driver-app`
- `service-organization-registry`
- `service-account-access`
- `service-driver-profile`
- `service-personnel-document-registry`
- `service-attendance-registry`
- `service-delivery-record`
- `service-dispatch-registry`
- `service-dispatch-operations-view`
- `service-region-registry`
- `service-region-analytics`
- `service-announcement-registry`
- `service-support-registry`
- `service-notification-hub`
- `service-vehicle-registry`
- `service-vehicle-assignment`
- `service-vehicle-operations-view`
- `service-driver-operations-view`
- `service-terminal-registry`
- `service-telemetry-hub`
- `service-telemetry-listener`
- `service-telemetry-dead-letter`
- `service-settlement-registry`
- `service-settlement-payroll`
- `service-settlement-operations-view`
- `service-settlement-inquiry`

아래 repo들은 root `development/` whitelist 바깥으로 둔다.

- local stack support repo
- legacy infra repo
- bridge lane / historical support repo

## Active Platform Runtime Repo Names

현재 application repo와 별도로, production runtime cutover를 위해 아래 runtime repo 이름을 active target으로 유지한다.

- `runtime-prod-release`
- `runtime-prod-platform`

이 이름들의 의미는 아래와 같다.

- `runtime-prod-release`
  - production rollout control plane
  - release intent, rollout plan, SSM dispatch, smoke, rollback evidence owner
- `runtime-prod-platform`
  - production EC2 runtime shape and canonical inventory owner
- plain root-tracked source slice로 등록된 대상

## Repo Retention Rule

root `development/` whitelist 변경은 아래 두 문서에서 먼저 정본을 바꾼 뒤에만 한다.

- `repo-map.md`
- `docs/mappings/current-runtime-inventory.md`

`WORKSPACE.md`의 부분 목록만 보고 source slice를 지우지 않는다. root source visibility는 whitelist 기준으로만 유지하고, support/legacy repo는 root 바깥으로 둔다.

## Working Rules

1. 새로운 서비스나 구조 변경은 먼저 `docs/`에 반영한다.
2. `development/` slice 안의 README는 slice 사용법과 운영 메모만 담고, 아키텍처/경계/런타임 정본은 `docs/`를 가리킨다.
3. 로컬 통합 실행 자산은 root `development/` whitelist 바깥의 별도 integration repo가 소유한다.
4. `settlement`처럼 아직 덜 분해된 영역은 기존 폴더를 그대로 승격하지 않는다.
5. 현재 runtime naming, compose service, gateway prefix는 `docs/mappings/current-runtime-inventory.md`를 먼저 본다.
6. `docs/rollout/plans/`는 active plan only다. 완료된 rollout artifact는 `docs/archive/historical/rollout/`로 이동한다.
7. archive는 문서 전용이다. 코드와 runtime 자산은 archive로 보내지 않는다.
8. slice-local `AGENTS.md`는 예외 규칙이 많은 slice에만 둔다. 현재 허용 범위는 플랫폼 루트와 `development/edge-api-gateway/`까지다.
9. `development/infra-*` slice는 platform-specific runtime infra만 소유한다. app code, shared library, cross-domain catch-all infra slice로 키우지 않는다.

## Current Workspace State

현재 시점은 `true monorepo umbrella migration in progress` 상태다.

- `docs/`는 platform source of truth다.
- root whitelist에 포함된 `development/*` slice는 root-tracked source로 전환한다.
- 루트는 whitelist 대상 source slice를 직접 추적한다.
- active implementation source는 root monorepo 안의 `development/*`다.
- old `MSA-Server/services`에는 direct runtime source가 더 이상 남아 있지 않다.

## Out Of Scope For This Root

이 루트는 아래를 직접 소유하지 않는다.

- 공용 라이브러리
- root `development/` whitelist 밖 support/legacy runtime
- build artifact
- node_modules, venv, generated runtime output

## Workspace Governance Update (2026-04-09)

## Workspace Governance Update (2026-04-27)

- The active `clever-msa-platform` root is the true monorepo umbrella for platform docs, contracts, rollout, and the whitelisted `development/*` source slices.
- Runtime implementation code under `development/` is owned and tracked by the root repo.
- The root GitHub view must expose only the approved whitelist: `front-web-console`, `front-driver-app`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, and active `service-*` slices.
- Slice implementation ownership stays with the slice boundary even though Git ownership is now root-level.
- New root-visible `development/*` source slices must be added to the whitelist and tracked by the root repo from day one.
