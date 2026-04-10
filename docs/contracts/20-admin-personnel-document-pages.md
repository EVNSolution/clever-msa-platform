# 20. Admin Personnel Document Pages

## 목적

이 문서는 단일 웹 콘솔에서 인사문서 화면을 어떻게 노출할지 page contract를 고정한다.

## 적용 범위

- `development/front-web-console/`
- `service-personnel-document-registry`
- `service-driver-profile`

## 라우트

1차 라우트는 아래처럼 고정한다.

1. `/personnel-documents`
2. `/personnel-documents/new`
3. `/personnel-documents/:documentRef`
4. `/personnel-documents/:documentRef/edit`

## 목록 페이지

`/personnel-documents`

역할:

1. 인사문서 운영 진입점
2. 기사 기준 문서 현황 확인
3. 문서 상세 화면으로 이동

기본 컬럼:

1. 기사명
2. 기사 식별자
3. 문서 종류
4. 상태
5. 제목
6. 발급일
7. 만료일

필터:

1. `driver_id`
2. 문서 상태
3. 문서 종류

원칙:

1. 목록 정본은 `service-personnel-document-registry` row를 기준으로 구성한다.
2. 기사명은 `service-driver-profile` read lookup으로 보강한다.
3. row 전체가 상세 진입점이다.

## 생성 페이지

`/personnel-documents/new`

역할:

1. 인사문서 메타데이터 생성

필드:

1. `driver_id`
2. `document_type`
3. `status`
4. `title`
5. `document_number`
6. `issuer_name`
7. `issued_on`
8. `expires_on`
9. `external_reference`
10. `notes`
11. `payload`

원칙:

1. `driver_id`는 필수다.
2. 파일 업로드 UI는 두지 않는다.
3. payload는 raw JSON textarea로 유지한다.

## 상세 페이지

`/personnel-documents/:documentRef`

섹션:

1. 기사 연결 정보
2. 기본 문서 정보
3. 발급/만료 정보
4. 외부 참조와 메모
5. payload 원문

원칙:

1. 메타데이터 중심으로 읽는다.
2. 파일 미리보기나 승인 타임라인은 1차에서 넣지 않는다.
3. 수정 버튼은 상세 상단에 둔다.

## 수정 페이지

`/personnel-documents/:documentRef/edit`

역할:

1. 인사문서 메타데이터 수정

원칙:

1. 수정 대상은 정본 메타데이터 필드만이다.
2. `driver_id` 변경도 허용하되, 항상 유효한 기사 참조를 유지해야 한다.

## 권한 해석

1. `system_admin`, `company_super_admin`, `settlement_manager`, `fleet_manager`는 생성/수정 가능
2. `vehicle_manager`는 읽기만 가능
3. `driver`는 웹 권한 없음

## 데이터 소스 계약

### 목록

1. personnel document 목록
2. 목록에 등장한 `driver_id`들의 기사 기본 정보 lookup

### 상세

1. personnel document detail 1건
2. 연결된 `driver_id`의 기사 기본 정보 1건

## UI 원칙

1. 1차는 예쁜 문서 뷰어보다 운영 메타데이터 가시성을 우선한다.
2. 문서 관리 시작점은 기사 상세 하위 탭이 아니라 독립 메뉴다.
3. 기사 문맥이 필요하면 `driver_id` 필터나 상세 연결 정보로 해결한다.
