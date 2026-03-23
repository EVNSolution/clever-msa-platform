# Driver Ops Runtime Naming Hard Cut 디자인

## 목적

이 문서는 `service-driver-operations-view`의 runtime naming에서 `driver-360` 표현을 제거하고, 역할 기반 naming으로 hard cut하는 기준을 고정한다.

이번 설계의 목표는 아래와 같다.

1. `driver-360-api`처럼 화면/consumer 이름이 runtime service 이름으로 노출되는 문제를 제거한다.
2. `service-driver-operations-view`의 역할이 container name, gateway prefix, env file name에서도 일관되게 드러나도록 맞춘다.
3. 내부 구현 세부와 외부 runtime 식별자를 분리해 설명과 API 호출의 역할 경계를 더 명확히 한다.

## 문제 정의

현재 `driver` read 서비스는 repo 경계와 runtime naming이 서로 다른 축을 사용한다.

- repo 이름: `service-driver-operations-view`
- container/service 이름: `driver-360-api`
- gateway prefix: `/api/driver-360/`

이 조합의 문제는 아래와 같다.

1. `driver-360`은 bounded role이 아니라 화면/consumer 이름이다.
2. 이름만 보고는 이 서비스가 `driver profile + account + organization + settlement`를 조합하는 read-only operations-view인지 드러나지 않는다.
3. `settlement-ops-api`, `dispatch-ops-api`, `vehicle-ops-api`와 달리 같은 suffix 체계를 따르지 않아 naming set 전체를 흔든다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-driver-operations-view` runtime service 이름
2. gateway 외부 prefix
3. integration-local-stack env file / compose / smoke naming
4. front consumer의 driver API base path
5. runtime naming을 설명하는 문서와 rollout 문서

## 비스코프

이번 설계에서는 아래를 다루지 않는다.

1. 다른 서비스의 naming 재정렬
2. `service-account-access`, `service-organization-registry`의 runtime alias 변경
3. `service-driver-operations-view` repo 이름 변경
4. Django app/module `driver360`의 내부 패키지 rename
5. read-model payload shape 변경

즉, 이번 배치는 `driver-360` runtime naming drift만 hard cut으로 정리하는 focused change다.

## 고려한 접근

### 1. 내부만 rename

- compose service/env alias만 `driver-ops-api`로 바꾸고 외부 prefix는 `/api/driver-360/`를 유지한다.

장점:

- 외부 consumer 충격이 적다.

단점:

- 실제 호출 계약은 여전히 `driver-360`을 사용한다.
- 설명과 API 호출에서 가장 혼란스러운 부분이 그대로 남는다.
- 역할 기반 naming 정렬 효과가 약하다.

### 2. runtime/public hard cut

- `driver-360-api`를 `driver-ops-api`로 바꾸고, `/api/driver-360/`를 제거한 뒤 `/api/driver-ops/`만 남긴다.

장점:

- runtime naming과 gateway naming이 repo 역할과 곧바로 맞춰진다.
- 설명, compose, env, gateway, front 호출 경로가 같은 언어를 쓴다.
- `settlement-ops`, `dispatch-ops`, `vehicle-ops`와 naming 계열이 맞춰진다.

단점:

- 기존 `/api/driver-360/` 호출은 같은 배치에서 모두 수정해야 한다.

### 3. dual-route transition

- 새 `/api/driver-ops/`를 추가하면서 `/api/driver-360/`도 일정 기간 alias로 유지한다.

장점:

- consumer 전환이 더 부드럽다.

단점:

- hard cut 원칙과 맞지 않는다.
- naming drift가 문서와 gateway에서 계속 살아남는다.
- 이번 작업의 목적을 약하게 만든다.

## 선택된 접근

이번 설계에서는 2번을 선택한다.

선택 이유는 아래와 같다.

1. 문제의 핵심이 외부 API naming drift이므로, 외부 prefix를 남겨둔 부분 정리는 의미가 작다.
2. 이 서비스는 이미 repo 이름에서 `operations-view` 역할이 고정돼 있으므로 runtime naming도 같은 축을 따라야 한다.
3. `driver-360`은 기능/화면 이름으로는 남을 수 있지만, service/container/gateway 식별자로 쓰기에는 경계 의미가 약하다.

## Naming 원칙

이번 배치에서 아래 원칙을 명시적으로 고정한다.

1. repo 이름이 역할 정본이다.
2. runtime service/container 이름은 repo 역할을 축약한 이름을 쓴다.
3. gateway prefix도 같은 역할 축을 사용한다.
4. 화면 이름, consumer 이름, dashboard 이름은 runtime naming에 쓰지 않는다.

이번 설계의 적용 결과는 아래와 같다.

- repo: `service-driver-operations-view`
- runtime service: `driver-ops-api`
- gateway prefix: `/api/driver-ops/`

## Rename 매핑

이번 hard cut에서 바뀌는 runtime naming은 아래와 같다.

| 영역 | 현재 | 변경 |
| --- | --- | --- |
| compose service | `driver-360-api` | `driver-ops-api` |
| env file | `infra/env/driver-360.env.example` | `infra/env/driver-ops.env.example` |
| allowed host | `driver-360-api` | `driver-ops-api` |
| gateway prefix | `/api/driver-360/` | `/api/driver-ops/` |
| upstream alias | `driver_360_upstream` | `driver_ops_upstream` |
| front operator API path | `/driver-360/drivers/<id>/` | `/driver-ops/drivers/<id>/` |

## 유지되는 것

이번 hard cut에서도 아래는 유지한다.

1. repo 이름 `service-driver-operations-view`
2. 내부 Django app/module `driver360`
3. `Driver 360`이라는 화면/기능 이름
4. 기존 read-model payload와 contract 의미

이 선택의 이유는 이번 배치의 목적이 runtime naming drift 정리이지, 내부 코드 구조 전체 rename이 아니기 때문이다.

## Hard Cut 규칙

이번 배치는 compatibility alias를 두지 않는다.

규칙:

1. `/api/driver-360/`는 제거한다.
2. gateway는 `/api/driver-ops/`만 노출한다.
3. front consumer와 local smoke 문서는 같은 배치에서 모두 새 prefix로 전환한다.
4. smoke에는 기존 `/api/driver-360/`가 더 이상 살아 있지 않음을 확인하는 항목을 넣는다.

## 구현 영향 범위

최소 수정 대상은 아래와 같다.

1. `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
2. `development/integration-local-stack/infra/env/driver-360.env.example` -> rename
3. `development/edge-api-gateway/nginx.conf`
4. `development/front-operator-console`의 driver summary API client
5. `development/integration-local-stack/README.md`
6. `development/integration-local-stack/compose/README.md`
7. `docs/rollout/13-account-driver-settlement-compose-simulation.md`
8. `docs/contracts/04-driver-360-read-model.md`의 runtime naming 설명
9. archive가 아닌 living docs 중 `driver-360-api`와 `/api/driver-360/`를 현재 runtime 식별자로 설명하는 문서들

historical implementation plan이나 과거 migration 기록처럼 당시 상태를 설명하는 문서는 소급 수정하지 않는다.

## 검증 원칙

최소 검증 범위는 아래와 같다.

1. `service-driver-operations-view` 테스트가 통과한다.
2. front operator의 관련 API client 테스트가 통과한다.
3. `docker compose ... config`가 통과한다.
4. `docker compose ... build driver-ops-api gateway`가 통과한다.
5. `GET /api/driver-ops/health/`가 `200`을 반환한다.
6. `GET /api/driver-ops/drivers/<seeded-driver-id>/`가 기존 summary contract를 유지한다.
7. `GET /api/driver-360/...`는 `404` 또는 미매핑 상태가 된다.

## 완료 기준

이번 설계가 구현으로 내려갈 준비가 됐다고 보는 기준은 아래와 같다.

1. `driver-360`이 runtime service/container/gateway naming에서 제거된다.
2. `driver-ops` naming이 repo 역할과 일관되게 연결된다.
3. 내부 package rename 같은 과도한 범위 확장은 이번 배치에서 제외된다는 점이 명시된다.
4. hard cut이라 alias를 남기지 않는다는 규칙이 분명하다.
