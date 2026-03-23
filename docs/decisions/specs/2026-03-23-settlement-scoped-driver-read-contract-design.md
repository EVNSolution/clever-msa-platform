# Settlement Scoped Driver Read Contract 디자인

## 목적

이 문서는 `service-settlement-operations-view`에 driver 단위 scoped read contract를 추가해 `service-driver-operations-view`가 settlement 전체 목록을 직접 fan-out 후 재조합하지 않도록 경계를 정리한다.

이번 설계의 목표는 아래와 같다.

1. `service-driver-operations-view`가 `settlement-ops`의 전체 `runs/items` 목록을 읽고 내부 필터링하는 구조를 제거한다.
2. `service-settlement-operations-view`가 settlement read-model 조립 책임을 더 직접적으로 가진다.
3. consumer 이름에 종속되지 않는 domain-named scoped endpoint를 도입한다.
4. 기존 `driver-360` summary contract가 요구하는 최신 정산 요약 1건만 더 좁은 payload로 제공한다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-settlement-operations-view`의 새 driver scoped read endpoint shape
2. latest settlement 선택 규칙
3. `service-driver-operations-view`의 consumer 전환 규칙
4. 관련 테스트와 문서 갱신 범위

## 비스코프

이번 설계에서는 아래를 다루지 않는다.

1. `service-settlement-payroll` write contract 변경
2. `service-settlement-registry`, `service-delivery-record` runtime 구현
3. settlement projection DB 또는 event pipeline 도입
4. timeline, settlement 상세 화면, 다건 list 최적화 전반
5. front UI 변경

## 현재 상태

현재 상태는 아래와 같다.

1. `service-settlement-operations-view`는 read-only fan-out 서비스로 동작하지만 외부에는 여전히 `/runs/`, `/items/` read endpoint만 제공한다.
2. `service-driver-operations-view`는 `settlement-ops`에서 `/runs/`와 `/items/` 전체를 받아온 뒤 `driver_id` 기준으로 최신 정산 1건을 내부에서 다시 고른다.
3. `docs/contracts/04-driver-360-read-model.md` 기준으로 실제 consumer가 필요한 것은 최신 정산 요약 1건뿐이다.

즉, 현재 구조는 read ownership은 나뉘었지만 query responsibility는 아직 소비자 쪽에 일부 남아 있다.

## 고려한 접근

### 1. 현행 유지

- `service-driver-operations-view`가 `/runs/`, `/items/` 전체를 계속 읽는다.

장점:

- 구현 변경이 가장 적다.

단점:

- settlement read-model 책임이 소비자 쪽에 남는다.
- payload가 커질수록 불필요한 fan-out 비용이 커진다.
- `driver-360` contract가 요구하지 않는 데이터를 계속 읽는다.

### 2. 공용 filtered collection 추가

- 예: `/runs/?driver_id=<uuid>`, `/items/?driver_id=<uuid>`

장점:

- 전체 목록보다는 payload가 줄어든다.

단점:

- 소비자가 여전히 run/item join과 latest 계산을 수행해야 한다.
- consumer 최적화는 일부 되지만 query semantics는 여전히 분산된다.

### 3. driver scoped summary endpoint 추가

- 예: `GET /drivers/<driver_id>/latest-settlement/`

장점:

- settlement 최신 요약 계산 책임이 `service-settlement-operations-view`에 모인다.
- consumer는 필요한 summary 1건만 읽는다.
- endpoint 이름은 consumer가 아니라 settlement domain query를 설명한다.

단점:

- read-model service에 조립 로직이 추가된다.

## 선택된 접근

이번 설계에서는 3번을 선택한다.

선택 이유는 아래와 같다.

1. `service-settlement-operations-view`는 read-only service이므로 source truth를 대신 쓰는 것이 아니라 read query를 더 잘 설명하는 방향으로 진화하는 것이 맞다.
2. `service-driver-operations-view`는 다른 정본 서비스 summary를 조합하는 consumer이지, settlement latest 계산 규칙의 소유자가 아니다.
3. endpoint 이름을 `driver-360` 같은 소비자 이름으로 만들지 않으면 다른 read consumer도 같은 domain query를 재사용할 수 있다.

## 새 read contract

`service-settlement-operations-view`는 아래 endpoint를 추가한다.

- `GET /drivers/<driver_id>/latest-settlement/`

외부 gateway prefix를 포함하면 아래가 된다.

- `GET /api/settlement-ops/drivers/<driver_id>/latest-settlement/`

이 endpoint는 authenticated read-only endpoint다.

## 응답 shape

정상 응답은 아래 wrapper shape로 고정한다.

```json
{
  "driver_id": "10000000-0000-0000-0000-000000000001",
  "latest_settlement": {
    "settlement_run_id": "60000000-0000-0000-0000-000000000001",
    "period_start": "2026-03-01",
    "period_end": "2026-03-31",
    "status": "draft",
    "payout_status": "pending",
    "amount": "125000.50"
  }
}
```

정산 이력이 없으면 아래처럼 응답한다.

```json
{
  "driver_id": "10000000-0000-0000-0000-000000000001",
  "latest_settlement": null
}
```

선택 이유:

1. `null` 케이스를 명확히 표현할 수 있다.
2. 이후 summary 필드가 늘어나도 top-level contract가 덜 흔들린다.
3. consumer는 존재 여부를 wrapper 하나로 판단할 수 있다.

## Latest 선택 규칙

latest settlement는 아래 규칙으로 고정한다.

1. `SettlementItem.driver_id == <driver_id>`인 item만 후보로 본다.
2. 각 candidate item은 연결된 `SettlementRun`을 join해 run metadata를 붙인다.
3. `period_end DESC` 순으로 최신을 고른다.
4. `period_end`가 같으면 `settlement_run_id DESC`를 tie-breaker로 사용한다.

이번 단계에서는 현재 구현과 동일한 latest semantics를 유지한다.

## Driver 존재 확인 규칙

이 endpoint는 `service-driver-profile`에 다시 fan-out해서 driver 존재 여부를 확인하지 않는다.

규칙:

1. settlement domain에서 해당 `driver_id`에 매칭되는 settlement data가 없으면 `200`과 `latest_settlement: null`을 반환한다.
2. driver가 실제로 존재하는지 여부는 `service-driver-operations-view` 또는 `service-driver-profile`의 책임으로 남긴다.

이 선택의 이유는 아래와 같다.

1. settlement read service가 사람 정본 존재 확인까지 떠안지 않게 하기 위함이다.
2. settlement query가 사람 정본 서비스에 불필요하게 결합되는 것을 막기 위함이다.
3. 이 endpoint가 답하는 질문은 "이 driver_id에 대해 settlement domain이 알고 있는 최신 결과가 무엇인가"이기 때문이다.

## Service 책임 재정렬

### `service-settlement-operations-view`

직접 책임:

- `settlement-payroll` fan-out read
- latest settlement summary 조립
- read-only contract validation

직접 책임 아님:

- driver profile 존재 확인
- settlement write
- payout 상태 변경

### `service-driver-operations-view`

직접 책임:

- driver profile, account, organization, settlement summary를 하나의 driver summary contract로 조합

직접 책임 아님:

- settlement latest 선택 규칙
- settlement run/item 컬렉션 join

## Backward Compatibility 원칙

이번 단계에서는 아래를 유지한다.

1. `service-settlement-operations-view`의 기존 `/runs/`, `/items/` read endpoint는 제거하지 않는다.
2. 다만 `service-driver-operations-view`는 더 이상 그 endpoint들을 사용하지 않는다.

즉, 새 scoped endpoint를 추가하되 소비자 전환을 먼저 하고, collection endpoint 축소는 후속 단계로 남긴다.

## 테스트 원칙

최소 검증 범위는 아래와 같다.

### `service-settlement-operations-view`

1. driver scoped endpoint가 최신 정산 1건을 올바르게 반환한다.
2. 정산 이력이 없으면 `200`과 `latest_settlement: null`을 반환한다.
3. upstream malformed payload는 기존 규칙대로 controlled error로 매핑한다.
4. upstream unavailable은 기존 규칙대로 `503` 계열로 매핑한다.

### `service-driver-operations-view`

1. source client가 `/drivers/<driver_id>/latest-settlement/`를 호출한다.
2. summary service는 collection fan-out 없이 scoped summary payload를 읽는다.
3. 정산이 없는 driver도 기존 summary contract를 깨지 않고 반환한다.

## 문서 영향 범위

구현 단계에서 최소한 아래 문서를 같이 갱신한다.

1. `docs/contracts/04-driver-360-read-model.md`
2. `development/service-driver-operations-view/README.md`
3. `development/service-settlement-operations-view/README.md`
4. 필요 시 settlement phase 2 implementation plan follow-up note

핵심 반영 내용:

1. Driver 360의 settlement source 설명을 기존 payroll 직접 fan-out 표현에서 `settlement-ops scoped summary`로 정리
2. `service-driver-operations-view`가 settlement collection을 직접 fan-out하지 않는다는 점 명시
3. `service-settlement-operations-view`가 domain-named scoped summary를 제공한다는 점 명시

## 완료 기준

이번 설계가 구현으로 내려갈 준비가 됐다고 보는 기준은 아래와 같다.

1. 새 endpoint path와 응답 shape가 고정된다.
2. `latest` 선택 규칙이 현재 구현과 동일하게 명시된다.
3. driver 존재 확인을 settlement domain이 다시 떠안지 않는다는 원칙이 명시된다.
4. `service-driver-operations-view`가 scoped summary consumer로 전환된다는 방향이 드러난다.
5. 기존 `/runs/`, `/items/` read endpoint 유지 여부가 후속 정리 항목으로 분리된다.
