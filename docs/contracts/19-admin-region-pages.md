# 19. Admin Region Pages

## 목적

이 문서는 단일 웹 콘솔에서 권역 화면을 어떻게 노출할지 page contract를 고정한다.

## 적용 범위

- `development/front-admin-console/`
- `service-region-registry`
- `service-region-analytics`

## 라우트

1차 라우트는 아래처럼 고정한다.

1. `/regions`
2. `/regions/new`
3. `/regions/:regionRef`
4. `/regions/:regionRef/edit`

## 목록 페이지

`/regions`

역할:

1. 권역 정본 목록 진입
2. 최신 운영 요약 확인
3. 상세 화면으로 이동

기본 컬럼:

1. 권역명
2. 상태
3. 난이도
4. 최신 일별 물량
5. 최신 완료율

원칙:

1. 목록은 `service-region-registry` row를 기준으로 구성한다.
2. analytics 요약은 최신 snapshot을 붙여 준다.
3. row 전체가 상세 진입점이다.
4. 목록에 대형 수정 폼을 넣지 않는다.
5. 목록은 현재 존재하는 최신 요약 값만 보여 주고, `최신 기준일` 같은 추가 메타 정보는 1차에서 노출하지 않는다.

## 생성 페이지

`/regions/new`

역할:

1. 권역 정본 생성

필드:

1. 권역 코드
2. 이름
3. 상태
4. 난이도
5. polygon GeoJSON
6. 설명
7. 표시 순서

원칙:

1. 1열 폼을 사용한다.
2. analytics 입력은 이 화면에 두지 않는다.
3. polygon 입력은 1차에서 `raw GeoJSON textarea`로 유지한다.

## 상세 페이지

`/regions/:regionRef`

섹션:

1. 기본 정보
2. polygon
3. 일별 통계
4. 기간 성과 요약

원칙:

1. 상세 진입 시 최근 analytics를 바로 보여 준다.
2. 날짜/기간 필터는 선택 사항이다.
3. 정본 편집 버튼은 상세 상단에 둔다.
4. analytics는 1차에서 읽기 중심이다.

## 수정 페이지

`/regions/:regionRef/edit`

역할:

1. 권역 정본 수정

원칙:

1. 수정 대상은 registry 필드만이다.
2. analytics는 수정 페이지가 아니라 상세에서 읽는다.

## 권한 해석

1. `system_admin`, `company_super_admin`는 생성/수정 가능
2. `fleet_manager`, `settlement_manager`, `vehicle_manager`는 읽기 중심
3. `driver`는 웹 권한 없음

## 데이터 소스 계약

### 목록

1. registry 목록
2. region별 최신 daily statistic 1건
3. region별 최신 performance summary 1건

### 상세

1. registry detail 1건
2. region_id 기준 daily statistics 목록
3. region_id 기준 performance summaries 목록

## UI 원칙

1. 예쁜 dashboard보다 운영 정보의 가시성을 우선한다.
2. analytics는 chart보다 표/요약 카드 우선으로 시작한다.
3. UX 검증이 목표이므로, 1차는 `목록 -> 상세 -> 수정` 흐름이 막히지 않는 것이 중요하다.
