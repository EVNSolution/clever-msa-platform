# CLEVER MSA Platform Workspace

이 워크스페이스는 `CLEVER` 안의 다른 프로젝트와 분리된 `MSA 전환 플랫폼 셸`이다.

목적은 두 가지다.
- 설계와 매핑의 정본을 `docs/`에 고정한다.
- 실제 구현은 `development/` 아래의 독립 repo들로 분리한다.

이 루트는 플랫폼 안내판이다. 서비스 구현 코드를 직접 두는 곳이 아니다.

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

`development/` 아래는 실제 구현 repo 묶음이다.

원칙:
- 각 디렉토리는 독립 repo 전제다.
- 루트에서는 모든 `development/*`를 linked child repo로 노출한다.
- 서비스는 다른 서비스 내부 구현을 import하지 않는다.
- 공유 코드는 기본 금지다.
- cross-service 연결은 계약 문서와 API 기준으로만 관리한다.

로컬 clone/update 규칙:
- 루트를 새로 clone한 뒤에는 `git submodule update --init --recursive`를 실행한다.
- root pull 이후 child repo 포인터가 바뀌면 다시 `git submodule update --init --recursive`를 실행한다.
- 첫 `git submodule update --init --recursive`는 private child repo를 순차 clone하므로 시간이 걸릴 수 있다. 실패로 보기 전에 먼저 진행 중인지 확인한다.
- 구현 코드는 child repo에서 수정하고, root는 umbrella visibility와 platform docs를 관리한다.

현재 목표 repo 이름 규칙:
- `integration-*`
  - 로컬 통합 실행 셸
- `infra-*`
  - 특정 runtime slice의 ALB, ECS, Route53, CDK deploy를 소유하는 전용 infra repo
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

## Active Naming Set

현재 기준 target repo는 아래와 같다.

- `integration-local-stack`
- `infra-ev-dashboard-platform`
- `edge-api-gateway`
- `front-web-console`
- `service-organization-registry`
- `service-account-access`
- `service-driver-profile`
- `service-vehicle-registry`
- `service-vehicle-assignment`
- `service-vehicle-operations-view`
- `service-driver-operations-view`
- `service-terminal-registry`
- `service-telemetry-hub`
- `service-telemetry-listener`
- `service-telemetry-dead-letter`
- `service-settlement-registry`
- `service-delivery-record`
- `service-settlement-payroll`
- `service-settlement-operations-view`

## Active Platform Infra Repo Names

현재 application repo와 별도로, platform-specific runtime cutover를 위해 아래 infra repo 이름을 active target으로 유지한다.

- `infra-ev-dashboard-platform`

## Planned Platform Infra Repo Names

다음 canonical public surface ECS transition 을 위해 아래 infra repo 이름을 planned target 으로 고정한다.

- `infra-clever-hub-platform`

의미는 아래와 같다.

- `hub.evnlogistics.com` canonical public surface 전용 shared runtime infra owner
- `candidate.hub.evnlogistics.com` pre-prod gate lane owner
- `front-web-console`, `edge-api-gateway`, `service-account-access` 를 시작점으로 하는 next ECS/CDK cutover 전용 infra repo
- active repo 생성 전에도 docs truth 와 naming 은 먼저 이 이름으로 고정한다

이 이름의 의미는 아래와 같다.

- `ev-dashboard.com` / `api.ev-dashboard.com` shared ALB, ECS services, ACM, Route53, deploy workflow owner
- shared app-code repo가 아니라 `ev-dashboard` slice 전용 infra repo
- plain 폴더가 아니라 linked child repo로 등록된 대상

## Additional Planned Domain Units

현재 active naming set 바깥에서 추가 계획 대상으로 고정한 큰 업무 단위는 아래와 같다.

- `배차`
- `인사문서`
- `권역분석`
- `알림`
- `공지 / 지원`

이 다섯 개는 아직 repo 이름이나 세부 service decomposition을 고정하지 않았다.
현재 단계에서는 큰 단위와 역할만 문서로 고정하고, skeleton 생성 직전에 naming과 분해를 다시 자른다.

## Planned Target Repo Names

추가 계획 대상 큰 단위를 위해 아래 target repo 이름을 먼저 고정했다.

- `service-dispatch-registry`
- `service-dispatch-operations-view`
- `service-personnel-document-registry`
- `service-region-registry`
- `service-region-analytics`
- `service-notification-hub`
- `service-announcement-registry`
- `service-support-registry`

이 이름들은 현재 모두 active runtime repo로 승격됐다. `service-dispatch-registry`, `service-dispatch-operations-view`, `service-personnel-document-registry`, `service-region-registry`, `service-region-analytics`, `service-notification-hub`, `service-announcement-registry`, `service-support-registry`는 target repo가 active source다.

## Working Rules

1. 새로운 서비스나 구조 변경은 먼저 `docs/`에 반영한다.
2. `development/` repo 안의 README는 repo 사용법만 담고, 아키텍처 정본은 `docs/`를 가리킨다.
3. 로컬 통합 실행 자산은 `development/integration-local-stack/`만 소유한다.
4. `settlement`처럼 아직 덜 분해된 영역은 기존 폴더를 그대로 승격하지 않는다.
5. 현재 runtime naming, compose service, gateway prefix는 `docs/mappings/current-runtime-inventory.md`를 먼저 본다.
6. `docs/rollout/plans/`는 active plan only다. 완료된 rollout artifact는 `docs/archive/historical/rollout/`로 이동한다.
7. archive는 문서 전용이다. 코드와 runtime 자산은 archive로 보내지 않는다.
8. repo-local `AGENTS.md`는 예외 규칙이 많은 repo에만 둔다. 현재 허용 범위는 플랫폼 루트, `development/integration-local-stack/`, `development/edge-api-gateway/`까지다.
9. `development/infra-*` repo는 platform-specific runtime infra만 소유한다. app code, shared library, cross-domain catch-all infra repo로 키우지 않는다.

## Current Workspace State

현재 시점은 `development/* linked child repo migration completed` 상태다.

- `docs/`는 platform source of truth다.
- active `development/*` repo는 모두 independent child repo다.
- 루트는 각 child repo를 linked child repo로 노출한다.
- active child repo에 대한 root-tracked implementation snapshot은 더 이상 남아 있지 않다.
- old `MSA-Server/services`에는 direct runtime source가 더 이상 남아 있지 않다.

## Out Of Scope For This Root

이 루트는 아래를 직접 소유하지 않는다.

- 서비스 런타임 코드
- 공용 라이브러리
- 실행용 compose 파일
- build artifact
- node_modules, venv, generated runtime output

## Workspace Governance Update (2026-04-09)

- The active `clever-msa-platform` root is the umbrella workspace for platform docs, contracts, rollout, and `development/*` repo visibility.
- Runtime implementation code under `development/` remains owned by each independent child repo.
- The root GitHub view must expose `development/*` repos consistently and must not hide one child repo selectively while others remain visible.
- Child repo implementation ownership stays in the child repo even when the root workspace also exposes that repo for umbrella visibility.
- New `development/*` repos must be added as linked child repos from day one.
