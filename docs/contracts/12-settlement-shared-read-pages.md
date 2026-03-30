# 12. Settlement Shared Read Pages

## 문서 목적

이 문서는 `정산 조회`를 `admin`과 `operator`가 어떻게 공유할지 고정한다.

이번 문서는 아래를 먼저 결정한다.

1. shared settlement read의 소속
2. shared settlement read의 데이터 소스
3. admin 전용 정산 화면과의 경계
4. operator가 볼 수 있는 정산 범위

## 기본 원칙

1. `정산 조회`는 shared read 화면이다.
2. `정산 조회`는 `front-admin-console`, `front-operator-console` 양쪽에 존재할 수 있다.
3. 두 콘솔은 같은 업무 화면을 보되, 같은 앱을 공유하는 것은 아니다.
4. 두 콘솔은 같은 read contract를 소비한다.

## 콘솔별 정산 구분

### Admin 전용

아래 정산 화면은 `admin`만 가진다.

1. `정산 기준`
2. `정산 입력`
3. `정산 실행`
4. `정산 결과`

### Shared

아래 정산 화면은 `admin`, `operator`가 함께 본다.

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

1. policy / version / assignment write
2. delivery input write
3. settlement run write
4. settlement item write
5. payout 이후 workflow write

## Operator 범위

1. `operator`는 정산을 생성하지 않는다.
2. `operator`는 정산 기준을 수정하지 않는다.
3. `operator`는 정산 입력을 수정하지 않는다.
4. `operator`는 정산 결과 원본을 수정하지 않는다.
5. `operator`는 자기 권한 범위의 read-only summary만 본다.

## Admin 범위

1. `admin`은 shared settlement read를 본다.
2. `admin`은 별도의 write 화면도 가진다.
3. `admin`의 조회 화면도 read-only여야 한다.
4. `admin`이 write를 하려면 `정산 기준 / 입력 / 실행 / 결과` 전용 화면으로 이동해야 한다.

## 라우트 기준

이번 문서는 shared read 화면의 최소 라우트만 고정한다.

- operator: `/settlements`
- admin: `/settlements/overview`

## 연결 문서

- `10-front-ui-rules.md`
- `11-settlement-admin-group-pages.md`
- `../rollout/12-settlement-phase-2-api-gates.md`
