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
- 서비스는 다른 서비스 내부 구현을 import하지 않는다.
- 공유 코드는 기본 금지다.
- cross-service 연결은 계약 문서와 API 기준으로만 관리한다.

현재 목표 repo 이름 규칙:
- `integration-*`
  - 로컬 통합 실행 셸
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
- `edge-api-gateway`
- `front-operator-console`
- `front-admin-console`
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

이 이름들은 현재 대부분 `empty-shell` 상태다. 다만 `service-dispatch-registry`, `service-dispatch-operations-view`는 active runtime repo로 승격됐고, 나머지는 shell 디렉토리와 README만 있는 상태다.

## Working Rules

1. 새로운 서비스나 구조 변경은 먼저 `docs/`에 반영한다.
2. `development/` repo 안의 README는 repo 사용법만 담고, 아키텍처 정본은 `docs/`를 가리킨다.
3. 로컬 통합 실행 자산은 `development/integration-local-stack/`만 소유한다.
4. `settlement`처럼 아직 덜 분해된 영역은 기존 폴더를 그대로 승격하지 않는다.
5. 현재 runtime naming, compose service, gateway prefix는 `docs/mappings/current-runtime-inventory.md`를 먼저 본다.
6. `docs/rollout/plans/`는 active plan only다. 완료된 rollout artifact는 `docs/archive/historical/rollout/`로 이동한다.
7. archive는 문서 전용이다. 코드와 runtime 자산은 archive로 보내지 않는다.
8. repo-local `AGENTS.md`는 예외 규칙이 많은 repo에만 둔다. 현재 허용 범위는 플랫폼 루트, `development/integration-local-stack/`, `development/edge-api-gateway/`까지다.

## Current Migration State

현재 시점은 `docs + integration + first direct-move repos migrated` 상태다.

- `docs/` 정본 구조는 생성 및 1차 복사 완료
- `integration-local-stack`는 실제 이동 완료
- `edge-api-gateway`, `front-operator-console`, `front-admin-console`는 target 위치로 이동 완료
- `service-organization-registry`는 target 위치로 이동 완료
- `service-account-access`는 target 위치로 이동 완료
- `service-driver-profile`는 target 위치로 이동 완료
- `service-vehicle-registry`는 target 위치로 이동 완료
- `service-vehicle-assignment`는 target 위치로 이동 완료
- `service-vehicle-operations-view`는 target 위치로 이동 완료
- `service-driver-operations-view`는 target 위치로 이동 완료
- `service-settlement-payroll`는 runtime 구현 완료, settlement write owner로 target repo가 활성화됐다
- `service-settlement-operations-view`는 read-only runtime으로 target repo가 활성화됐다
- `service-settlement-registry`, `service-delivery-record`는 empty shell 생성 완료
- `service-terminal-registry`는 runtime 구현 완료, target repo가 활성화됐다
- `service-telemetry-hub`는 runtime 구현 완료, target repo가 활성화됐다
- `service-telemetry-listener`는 MQTT ingress worker runtime 구현 완료, target repo가 활성화됐다
- `service-telemetry-dead-letter`는 runtime 구현 완료, target repo가 활성화됐다
- `service-dispatch-registry`는 runtime 구현 완료, target repo가 활성화됐다
- `service-dispatch-operations-view`는 runtime 구현 완료, target repo가 활성화됐다
- old `MSA-Server/services`에는 direct runtime source가 더 이상 남아 있지 않다

## Out Of Scope For This Root

이 루트는 아래를 직접 소유하지 않는다.

- 서비스 런타임 코드
- 공용 라이브러리
- 실행용 compose 파일
- build artifact
- node_modules, venv, generated runtime output
