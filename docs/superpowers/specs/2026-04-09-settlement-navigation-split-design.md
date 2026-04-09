# Settlement Navigation Split Design

## Purpose

이 문서는 정산 도메인의 좌측 네비게이션과 내부 탭 구조를 다시 나누는 UI/UX 결정을 고정한다.

현재 `/settlements/*`는 아래 두 성격이 한 흐름처럼 섞여 있다.

- `정산 조회`
  - read-only 요약과 최신 정산 현황 확인
- `정산 기준 / 정산 입력 / 정산 실행 / 정산 결과`
  - 기준 설정부터 실행, 결과 보정까지 이어지는 처리 흐름

이 상태에서는 `정산 조회`도 순서형 프로세스의 한 단계처럼 보인다. 하지만 실제 기능상 `정산 조회`는 별도 entry다. 반면 `정산 결과`는 실행 뒤 결과 확인과 수동 보정까지 포함하므로 처리 흐름의 후반 단계에 가깝다.

이번 변경의 목적은 정산 화면을 더 꾸미는 것이 아니라, 정보 구조를 `조회`와 `처리`로 분리해 사용자가 길을 바로 이해하게 만드는 것이다.

## Primary Decision

정산 영역은 아래 두 층으로 재구성한다.

1. 좌측 메인 네비게이션
- `정산 조회`
- `정산 처리`

2. `정산 처리` 내부 가로 탭 스트립
- `정산 기준`
- `정산 입력`
- `정산 실행`
- `정산 결과`

즉 좌측 네비게이션은 entry point를 나누고, 가로 탭은 처리 단계의 순서를 보여주는 역할만 맡는다.

## Naming Decision

상위 처리 흐름 이름은 `정산 처리`로 고정한다.

`정산 과정`보다 `정산 조회`와 짝이 더 선명하고, 운영 화면의 액션 의미도 더 명확하다.

- `정산 조회`
  - 현재 상태, 최신 실행, 최신 결과를 읽는 entry
- `정산 처리`
  - 기준 설정, 입력 점검, 실행 생성, 결과 보정까지 이어지는 작업 entry

## Information Architecture

### 1. 좌측 메인 네비게이션

기존 단일 `정산` 링크는 제거하고 아래 두 링크로 분리한다.

- `정산 조회`
  - 진입 경로: `/settlements/overview`
- `정산 처리`
  - 진입 경로: `/settlements/criteria`

이 둘은 같은 settlement 도메인 안에 있지만, 사용자의 진입 의도가 다르다.

- `정산 조회`는 현황 파악
- `정산 처리`는 순차 작업 시작

### 2. 내부 가로 탭 스트립

가로 탭 스트립은 `정산 처리` 화면에서만 유지한다.

표시 순서는 아래와 같다.

1. `정산 기준`
2. `정산 입력`
3. `정산 실행`
4. `정산 결과`

이 탭 스트립은 처리 흐름을 암시하는 시각 요소이므로, read-only overview에는 노출하지 않는다.

### 3. 조회 화면

`정산 조회`는 독립 페이지처럼 보이게 만든다.

- 가로 탭 스트립 없음
- 처리 단계 번호 없음
- 처리 문맥 전환을 강요하지 않음

조회 화면은 현재처럼 read-only summary 역할을 유지하되, 상위 entry가 분리되므로 사용자는 이 화면을 더 이상 프로세스 중 한 단계로 해석하지 않게 된다.

### 4. 처리 화면

`정산 처리`는 기존 settlement flow 문맥을 유지한다.

- 회사/플릿 문맥 선택
- 단계 탭 이동
- 처리 순서를 암시하는 가로 탭 구조

즉 문맥 바와 단계 탭은 `정산 처리`에만 남긴다.

## Route Decision

이번 변경은 정보 구조를 바꾸는 작업이지 라우트 네임스페이스를 다시 설계하는 작업은 아니다.

따라서 route namespace는 그대로 유지한다.

- `/settlements/overview`
- `/settlements/criteria`
- `/settlements/inputs`
- `/settlements/runs`
- `/settlements/results`

기존 `/settlements` base route는 legacy entry로 유지하고, 1차에서는 `/settlements/overview`로 redirect한다.

이 결정의 이유는 아래와 같다.

- 기존 링크와 북마크를 불필요하게 깨지 않는다.
- 이번 작업의 핵심은 화면 구조 분리이지 URL 계약 변경이 아니다.
- Playwright와 route 기반 테스트의 변경 폭을 낮춘다.

## Functional Boundary Clarification

### `정산 조회`

`정산 조회`는 read-only overview다.

- `settlement-ops` read API 사용
- 최근 run, item, 배송원 최신 정산 상태 확인
- 생성/수정/삭제 없음

### `정산 결과`

`정산 결과`는 조회가 아니라 처리 흐름의 마지막 단계로 본다.

이유:

- 결과 항목 생성 가능
- 결과 항목 수정 가능
- 결과 항목 삭제 가능
- 실행 이후 산출물 점검과 수동 보정 책임이 있음

따라서 `정산 결과`는 `정산 처리` 탭 안에 남긴다.

## Permission Contract Decision

이번 변경은 네비게이션 entry를 둘로 나누지만, 권한 계약까지 둘로 나누지는 않는다.

1차 결정:

- 기존 navigation policy key `settlements`는 그대로 유지한다.
- 좌측의 `정산 조회`, `정산 처리` 두 링크는 모두 같은 `settlements` 권한으로 노출한다.
- 회사/관리자 메뉴 정책 화면에서도 여전히 하나의 `정산` 항목만 편집한다.

즉 이번 작업은 `권한 분리`가 아니라 `정보구조 분리`다.

이 결정으로 아래를 피한다.

- 백엔드 allowed nav key 확장
- 정책 API 계약 변경
- 메뉴 정책 화면의 대규모 동반 수정

대신 프론트 네비게이션 모델은 `화면 식별자`와 `권한 key`를 분리할 수 있어야 한다. 그래야 두 개의 좌측 링크가 하나의 권한 gate를 공유할 수 있다.

## UI Behavior Decisions

### 1. `정산 조회` 활성 상태

좌측 메인 네비게이션에서 아래 경로일 때 `정산 조회`가 활성 상태가 된다.

- `/settlements/overview`
- 필요 시 overview의 하위 read-only 확장 경로

### 2. `정산 처리` 활성 상태

좌측 메인 네비게이션에서 아래 경로일 때 `정산 처리`가 활성 상태가 된다.

- `/settlements/criteria`
- `/settlements/inputs`
- `/settlements/runs`
- `/settlements/results`

### 3. 처리 진입점

`정산 처리` 클릭 시 기본 landing은 `정산 기준`으로 맞춘다.

이유:

- 처리 흐름의 시작점이 가장 명확하다.
- `입력 > 실행 > 결과`의 선행 조건을 보여준다.
- 사용자가 현재 어느 단계에서 시작해야 하는지 덜 헷갈린다.

## Out of Scope

이번 변경은 아래를 포함하지 않는다.

- settlement API shape 변경
- settlement backend boundary 변경
- 메뉴 정책 백엔드의 nav key 분해
- `/settlements/*` 외의 별도 namespace 신설
- 정산 조회 화면의 데이터 내용 전면 개편

## Testing Direction

구현은 TDD로 진행한다. 최소 검증 범위는 아래다.

1. 레이아웃/네비게이션 테스트
- 좌측에 `정산 조회`와 `정산 처리`가 각각 보인다.
- `/settlements/overview`에서는 `정산 조회`만 활성화된다.
- `/settlements/criteria`, `/inputs`, `/runs`, `/results`에서는 `정산 처리`가 활성화된다.

2. 섹션 레이아웃 테스트
- `정산 조회` 화면에는 처리 탭 스트립이 보이지 않는다.
- `정산 처리` 화면에는 `기준 > 입력 > 실행 > 결과` 탭 스트립이 보인다.
- 처리 화면에서 회사/플릿 문맥이 유지된다.

3. 로컬 브라우저 검증
- `http://localhost:8080`
- 좌측 네비게이션 분리 확인
- 조회 진입과 처리 진입이 서로 다른 mental model로 보이는지 확인
- 처리 화면의 가로 탭이 순서형 흐름으로 유지되는지 확인

## Final Decision Summary

1. 좌측 메인 네비게이션의 단일 `정산` 링크를 `정산 조회`와 `정산 처리`로 분리한다.
2. `정산 처리`의 이름을 상위 흐름 명칭으로 고정한다.
3. 가로 탭 스트립은 `정산 처리`에서만 유지한다.
4. `정산 결과`는 조회가 아니라 처리 흐름의 마지막 단계로 본다.
5. route namespace는 유지하고, base `/settlements`는 overview로 redirect한다.
6. permission contract는 1차에서 `settlements` 단일 key를 유지한다.
