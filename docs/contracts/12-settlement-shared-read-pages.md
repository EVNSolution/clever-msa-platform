# 12. Settlement Shared Read Pages

## 문서 목적

이 문서는 단일 웹 콘솔에서 `정산 조회`를 권한 기반 shared read로 어떻게 다룰지 current truth 기준으로 고정한다.

이번 문서는 아래를 먼저 결정한다.

1. shared settlement read의 소속
2. shared settlement read의 데이터 소스
3. 정산 처리 화면과의 경계
4. lower manager가 볼 수 있는 정산 범위

## 기본 원칙

1. `정산 조회`는 shared read 화면이다.
2. `정산 조회`는 `front-web-console` 안의 shared route로 존재한다.
3. shared settlement read는 `/settlements/overview` 독립 route로 존재한다.
4. shared settlement read는 같은 read contract를 소비한다.

## 콘솔별 정산 구분

### Write 전용

아래 정산 화면은 write 권한을 가진 manager/admin만 가진다.

1. `정산 기준`
2. `정산 입력`
3. `정산 실행`
4. `정산 결과`

### Shared

아래 정산 화면은 권한이 허용된 manager가 함께 본다.

1. `정산 조회`

## 연결 규칙

1. shared settlement read는 `/api/settlement-ops/`만 사용한다.
2. shared settlement read는 `/api/settlements/`를 직접 읽지 않는다.
3. shared settlement read는 write endpoint를 호출하지 않는다.
4. shared settlement read는 read-only summary만 다룬다.

## 화면 범위

shared settlement read는 아래 범위만 가진다.

1. 정산 실행 목록 read
2. 정산 결과 목록 read
3. 배송원 기준 latest settlement read
4. 배송이력 존재 여부
5. 배송이력 기반 근태 추정 여부

shared settlement read는 아래 범위를 가지지 않는다.

1. 전역 정산 설정 수정
2. 회사·플릿 단가표 수정
3. delivery input write
4. settlement run write
5. settlement item write
6. payout 이후 workflow write

## Lower Manager 범위

1. lower manager는 정산을 생성하지 않는다.
2. lower manager는 정산 기준을 수정하지 않는다.
3. lower manager는 정산 입력을 수정하지 않는다.
4. lower manager는 정산 결과 원본을 수정하지 않는다.
5. lower manager는 자기 권한 범위의 read-only summary만 본다.

## High Manager 범위

1. high manager는 shared settlement read를 본다.
2. high manager는 별도의 `정산 처리` 화면도 가진다.
3. 조회 화면 자체는 read-only여야 한다.
4. write를 하려면 `/settlements/criteria`, `/settlements/inputs`, `/settlements/runs`, `/settlements/results`로 이동해야 한다.

## 라우트 기준

이번 문서는 shared read 화면의 최소 라우트만 고정한다.

- shared read page: `/settlements/overview`

## 연결 문서

- `10-front-ui-rules.md`
- `11-settlement-admin-group-pages.md`
- `../rollout/12-settlement-phase-2-api-gates.md`
