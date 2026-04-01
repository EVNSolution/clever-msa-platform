# 10. Front UI Rules

## 문서 목적

이 문서는 `front-operator-console`, `front-admin-console`의 공통 UI 규칙을 고정한다.

목표는 탭마다 다른 입력 레이아웃을 줄이고, 목록/상세/수정의 역할을 분리해서 운영형 화면을 일관되게 유지하는 것이다.

## 적용 범위

- `development/front-operator-console/`
- `development/front-admin-console/`

## 기본 원칙

### 1. 탭 첫 화면은 목록이다

- 각 탭의 기본 라우트는 목록 화면이다.
- 목록 화면은 검색, 상태 확인, 이동 진입점 역할만 가진다.
- 긴 상세 데이터와 대형 입력 폼을 기본 탭 화면에 같이 두지 않는다.

### 2. 생성, 상세, 수정은 라우트로 분리한다

- 생성은 별도 라우트로 분리한다.
- 상세는 별도 라우트로 분리한다.
- 수정은 별도 라우트로 분리한다.
- 목록 화면 안에서 긴 수정 폼을 같이 펼치지 않는다.

### 3. 기본 입력 폼은 1열이다

- 생성 화면과 수정 화면의 기본 폼은 1열이다.
- 한 줄에 한 필드를 둔다.
- 여러 필드를 같은 줄에 강제로 배치하지 않는다.
- 버튼 줄은 폼 하단에 한 줄로 둔다.

### 4. 상세는 읽기 전용 요약과 연결 정보 중심이다

- 상세 화면은 읽기 전용 요약과 연결 관계를 보여준다.
- 긴 값, 상태 변화, 연결된 리소스는 상세 라우트에서만 본다.
- 목록 화면에는 이름, 상태, 핵심 요약만 둔다.

## 공통 레이아웃 규칙

### 1. 화면 바깥 구조는 고정한다

- 로그인 화면은 `auth-shell` 2열 구조를 기본으로 둔다.
- 로그인 이후 화면은 `topbar + page-body` 구조를 기본으로 둔다.
- `page-body`는 좌우 여백을 유지하고, 내용 영역은 항상 `min-width: 0` 기준으로 줄어들 수 있어야 한다.

### 2. 기본 컨테이너는 panel 계열로 통일한다

- 주요 읽기/입력 단위는 `panel`로 감싼다.
- `panel`은 카드형 배경, 라운드 코너, 동일 shadow를 공유한다.
- 한 화면 안에서 의미가 다른 블록은 panel 단위로 끊는다.

### 3. 텍스트 넘침은 기본적으로 막는다

- 제목, 본문, 표 셀, 계정 정보는 줄바꿈 가능 상태를 기본으로 둔다.
- 긴 값 때문에 가로 스크롤이 생기지 않게 `overflow-wrap` 기준으로 처리한다.
- 길고 내부적인 값은 줄바꿈으로 버티지 말고, 애초에 기본 화면에서 숨긴다.

### 4. 공통 배치 primitive를 재사용한다

- 세로 누적은 `stack`
- 큰 세로 간격은 `large-gap`
- 일반 2열 읽기 배치는 `data-grid two-columns`
- 좌측 작업 패널, 우측 목록/상세는 `data-grid two-columns wide-left`
- `wide-left`의 좌측 패널 폭은 비율로 흔들지 않고 고정 상한 폭으로 맞춘다.
- 상하 관계 요약은 `relationship-grid`

## 폼 규칙

### 1. 신규 화면은 1열 폼을 기본으로 둔다

- 신규 생성/수정 화면은 `form-stack` 또는 1열과 같은 구조를 사용한다.
- 필드는 위에서 아래로 읽히는 순서로 쌓는다.
- 저장, 취소, 삭제 같은 조작은 마지막 줄에 모은다.

### 2. 기존 `form-grid` 화면은 정리 대상이다

- 현재 일부 화면은 `form-grid` 기반 다열 배치를 아직 사용한다.
- 이 구조는 과도기 이름만 남은 상태로 본다.
- shared CSS에서도 `form-grid`는 1열 폭 규칙으로 맞춘다.
- 새 화면이나 리팩터링 화면에서는 다열 form 의미로 되돌리지 않는다.
- 예외는 관계 요약 상세 화면뿐이다.

### 3. 입력 필드 자체 규칙은 공통으로 둔다

- `input`, `select`는 항상 전체 폭을 사용한다.
- `input`, `select`는 같은 높이, 같은 border radius, 같은 padding을 사용한다.
- 브라우저 기본 `select` 모양은 그대로 두지 않고, 공통 control 스타일로 덮는다.
- `button`과 `a.button`은 같은 box model과 정렬 규칙을 사용한다.
- 라벨은 필드 위에 둔다.
- 읽기 전용 값도 입력처럼 보이지 않게 문맥에 따라 detail block으로 내린다.

## 표와 상세 요약 규칙

### 1. 목록 표는 fixed layout을 기본으로 둔다

- 목록 표는 `table-layout: fixed` 기준으로 본다.
- 셀 안 텍스트는 줄바꿈되더라도 레이아웃이 깨지지 않아야 한다.
- 헤더는 작은 대문자 스타일과 muted color를 유지한다.
- 모바일 폭에서는 표 padding과 글자 크기를 줄이고, 필요 시 `auto` layout으로 완화한다.
- 모바일에서도 페이지 전체 가로 넘침은 만들지 않는다.

### 2. 상세 값은 detail-list로 읽게 만든다

- 상세 페이지의 핵심 값은 `detail-list` 형태로 둔다.
- 값은 이름, 상태, 연결 관계 중심으로만 보여준다.
- 복잡한 내부 값은 상세에서도 기본 노출 대상이 아니다.

### 3. 액션 위치는 흔들지 않는다

- 목록 화면은 `보기`, `수정` 전용 액션 열을 두지 않는다.
- 목록 로우 전체를 상세 진입 트리거로 사용한다.
- 목록 로우 클릭은 상세 라우트 또는 상세 화면 진입과 같은 의미를 가져야 한다.
- 목록 화면 액션 셀은 위쪽이 아니라 가운데 정렬을 기본으로 둔다.
- 상세 화면 액션은 상단 헤더 또는 하단 `page-actions`에 둔다.
- 읽기와 쓰기 액션을 한 블록 안에 과하게 섞지 않는다.

### 4. 수정 버튼은 상세에만 둔다

- 목록 화면의 `수정` 버튼은 두지 않는다.
- 상세 화면만 `수정` 진입 버튼을 가진다.
- 생성 화면과 수정 화면은 직접 URL 진입 또는 상세 화면의 수정 버튼으로만 연다.

### 4. 로그인 계정 표시도 공통 카드로 본다

- 상단 로그인 계정 표시는 `account-card` 공통 형태를 쓴다.
- 이메일과 권한 텍스트는 한 묶음으로 정렬한다.
- 로그아웃 버튼은 같은 카드 안에 두되, 텍스트 묶음과 시각적으로 충돌하지 않게 분리한다.

## 상태 표시 규칙

### 1. 로딩, 빈 상태, 에러는 공통 형태를 쓴다

- 에러는 `error-banner`
- 로딩과 빈 상태는 `empty-state`
- 같은 화면 안에서 에러 표현 방식을 섞지 않는다.

### 2. 상태 문구는 짧게 쓴다

- 로딩은 `...불러오는 중입니다`
- 빈 상태는 `...없습니다`
- 에러는 원문 전체를 길게 쏟지 말고, 화면 문맥에 맞는 한 줄로 자른다.

### 3. 경고와 비어 있음은 구분한다

- 데이터가 없는 경우와 소스를 읽지 못한 경우는 다른 상태다.
- `없음`과 `unavailable`을 같은 문구로 처리하지 않는다.

## 세션 규칙

### 1. 로그인 세션은 새로고침 후에도 유지한다

- 브라우저는 세션 payload를 로컬에 보관한다.
- API 호출은 refresh cookie 기반으로 access token을 갱신한다.
- 새로고침은 로그아웃 이유가 되지 않는다.

### 2. 인증 실패 시 처리도 고정한다

- `401`이면 저장 세션을 지운다.
- 로그인 화면으로 되돌린다.
- 사용자가 다시 로그인할 수 있게 짧은 에러 문구를 보여준다.

## 반응형 규칙

### 1. 모바일에서는 다열을 풀어 1열로 접는다

- `auth-shell`
- `data-grid two-columns`
- `data-grid two-columns wide-left`
- `relationship-grid`
- `form-grid`

위 구조는 모바일 폭에서 1열로 내려가야 한다.

### 2. 여백도 같이 줄인다

- 모바일에서는 `page-body`, `panel`, 로그인 화면 padding을 줄인다.
- 네비게이션과 계정 카드도 왼쪽 정렬 기준으로 다시 쌓는다.

## 예외 규칙

### 1. 상하 관계를 설명하는 상세 화면은 2열을 허용한다

- 기본은 1열이지만, 관계를 설명하는 상세 화면에 한해 2열을 허용한다.
- 이 예외는 입력 폼이 아니라 관계 요약 화면에만 적용한다.
- 왼쪽은 상위 리소스 요약, 오른쪽은 하위 리소스 목록 또는 연결 요약으로 둔다.

## Company / Fleet 규칙

### 1. Company가 상위다

- `fleet`는 독립 루트 리소스로 다루지 않는다.
- `fleet`는 항상 `company` 하위 관계로 다룬다.

### 2. Company 상세는 관계 화면이다

- `company` 상세 화면은 2열 관계 화면을 허용한다.
- 왼쪽은 `company` 요약이다.
- 오른쪽은 해당 `company`의 `fleet` 목록이다.

### 3. Fleet 생성과 수정은 Company 문맥 안에서만 연다

- `fleet` 생성은 `company` 하위 라우트에서만 연다.
- `fleet` 수정도 `company` 하위 라우트에서만 연다.
- 전역 `fleet` 입력 화면은 두지 않는다.

## Vehicle / Terminal 규칙

### 1. 브라우저 정보 구조는 vehicle 중심이다

- 브라우저에서는 `terminal`을 독립 관리 리소스로 노출하지 않는다.
- 차량 상세가 terminal 정보와 live 상태를 함께 보여주는 중심 화면이다.
- `terminal`은 browser information architecture에서 `vehicle` 하위 정보로 본다.

### 2. Vehicle은 일반 CRUD 규칙의 예외를 가진다

- `vehicle`의 `C/R/D` 진입은 `vehicle list`가 가진다.
- `vehicle`의 `U` 진입은 `vehicle detail`만 가진다.
- `vehicle list`는 테이블 기반 운영 화면으로 유지한다.
- `vehicle`은 일반 리소스처럼 `new` full-page form을 기본으로 강제하지 않는다.

### 3. Vehicle 상세가 보여야 할 내용

- 기본 차량 정보
- terminal 정보
- live telemetry freshness
- 연결 경고와 상태 변화 요약

### 4. Terminal 연결은 웹 수동 설치 흐름으로 만들지 않는다

- 브라우저에서 `vehicle`에 `terminal`을 수동 설치/해제하는 화면을 두지 않는다.
- terminal과 vehicle의 연결은 MQTT ingress와 `vin` 기준 시스템 연결로 본다.
- 브라우저는 그 결과를 읽기만 한다.

### 5. 실시간 UI 규칙이 필요하다

- `vehicle list`와 `vehicle detail`은 수동 새로고침 없이 상태 변화를 반영해야 한다.
- 구현 방식은 live subscription 또는 bounded auto-refresh 중 하나를 택할 수 있다.
- 어떤 방식이든 사용자는 마지막 수집 시각과 freshness 상태를 항상 볼 수 있어야 한다.

## 라우트 규칙

### 1. 리소스 화면은 아래 역할로 분리한다

- 목록
- 생성
- 상세
- 수정

### 2. 기본 형태

- `/<resource>`
- `/<resource>/new`
- `/<resource>/:ref`
- `/<resource>/:ref/edit`

### 3. 브라우저 URL은 route_no만 사용한다

- 브라우저 URL에는 원본 `*_id`를 직접 넣지 않는다.
- 브라우저 URL path segment는 서비스별 `route_no`를 사용한다.
- `route_no`는 짧은 정수 값으로 유지한다.
- 링크 복사, 새로고침, 북마크, 브라우저 히스토리 기준으로도 같은 규칙을 유지한다.
- 읽기 화면에서 raw ID를 숨기는 것만으로는 충분하지 않다. URL도 같이 숨겨야 한다.
- 이 규칙은 브라우저의 모든 상세, 수정, 관계 라우트에 적용한다.
- 새 브라우저 라우트를 추가할 때는 프론트 임시 키를 만들지 않고, 정본 서비스가 `route_no`를 먼저 제공해야 한다.
- read-model이나 ops summary도 브라우저 상세 라우트를 열어야 하면 `route_no`를 응답에 포함해야 한다.

### 3. Company / Fleet 형태

- `/companies`
- `/companies/new`
- `/companies/:companyRef`
- `/companies/:companyRef/edit`
- `/companies/:companyRef/fleets/new`
- `/companies/:companyRef/fleets/:fleetRef`
- `/companies/:companyRef/fleets/:fleetRef/edit`

## 화면 구성 규칙

### 1. 목록 화면

- 짧은 테이블 또는 카드 목록만 둔다.
- 상세는 로우 클릭으로 이동한다.
- 생성도 별도 버튼으로 이동한다.
- 목록 로우는 `button`처럼 보이지 않더라도 hover, cursor, focus 기준으로 클릭 가능 상태를 드러낸다.

### 2. 생성 화면

- 1열 폼만 둔다.
- 저장과 취소만 둔다.
- 목록 테이블을 같이 두지 않는다.

### 3. 수정 화면

- 1열 폼만 둔다.
- 저장과 취소만 둔다.
- 주변 목록이나 다른 리소스 수정 폼을 같이 두지 않는다.

### 4. 상세 화면

- 값 노출은 이름, 상태, 요약 중심이다.
- 긴 식별자와 내부 식별자는 화면 기본값으로 노출하지 않는다.
- 필요한 경우 연결된 리소스로 이동하는 링크만 둔다.

## 현재 라우트 정리 방향

### Operator

- `drivers`: 목록 / 상세 / 수정 분리
- `vehicles`: 목록 / 상세 분리 유지
- `settlements`: shared read-only 조회 화면

### Admin

- `accounts`: 목록 / 생성 / 상세 / 수정 분리
- `companies`: 목록 / 생성 / 상세 / 수정 분리
- `fleets`: `company` 하위 상세 / 생성 / 수정으로만 분리
- `drivers`: 목록 / 생성 / 상세 / 수정 분리
- `vehicles`: 목록 중심, 상세 소유, terminal/live info 포함
- `vehicle-assignments`: 목록 / 생성 / 상세 / 수정 분리
- `settlements`: `기준 / 입력 / 실행 / 결과 / 조회` 분리

## 콘솔 소속과 권한 규칙

### 1. 콘솔 소속과 권한은 분리해서 본다

- `admin / operator`는 페이지가 어느 콘솔에 속하는지 정하는 기준이다.
- `permission`은 같은 페이지 안에서 무엇을 할 수 있는지 정하는 기준이다.
- 같은 리소스라도 콘솔 소속과 write 권한을 한 번에 같은 뜻으로 취급하지 않는다.

### 2. Admin은 정산 write owner 화면을 가진다

- `정산 기준`
- `정산 입력`
- `정산 실행`
- `정산 결과`

위 화면은 `front-admin-console`에만 둔다.

### 3. 정산 조회는 shared read 화면으로 본다

- `정산 조회`는 `admin`과 `operator`가 모두 본다.
- 두 콘솔은 서로 다른 앱이지만, 같은 read contract를 공유한다.
- shared 정산 조회는 항상 read-only다.

### 4. Shared 정산 조회의 연결 규칙

- shared 정산 조회는 `/api/settlement-ops/`만 사용한다.
- `operator`는 `/api/settlements/`를 직접 읽지 않는다.
- `admin`도 조회 화면에서는 payroll direct read 대신 `settlement-ops`를 우선한다.
- write 화면만 `/api/settlements/`를 사용한다.

### 5. 정산 UI 1차 범위는 그룹 페이지 분리까지만 본다

- 이번 단계의 settlement UI 정리는 `기준 / 입력 / 실행 / 결과 / 조회` 그룹 라우트 분리까지를 완료 기준으로 둔다.
- `policy`, `version`, `assignment`, `delivery-record`, `snapshot`, `run`, `item` 각각의 상세 / 생성 / 수정 라우트 세분화는 후속 단계로 남긴다.
- `operator` settlement 화면은 shared read summary 화면 한 장으로 유지한다.
- `admin` settlement의 생성 / 수정은 그룹 페이지 안에서 모달로 연다.
- settlement 하위 write 리소스는 별도 full-page 생성 폼을 두지 않는다.
- settlement 그룹 상단에는 카드형 단계 이동만 둔다.
- settlement 그룹 상단의 별도 버튼형 보조 네비게이션과 `현재 단계` 요약 블록은 두지 않는다.

## 현재 적용 메모

### 1. 현재 규칙에 이미 맞는 화면

- `admin accounts`
- `admin companies`
- `admin fleets`
- `admin drivers`
- `admin settlements`
- `operator drivers`
- `operator driver detail`
- `operator vehicles`
- `operator settlements`

### 2. 아직 정리 중인 화면

- `admin vehicles`의 vehicle-centered terminal/live 재구성
- `admin terminals` 제거
- `admin vehicle-assignments`

## 금지 규칙

1. 탭 기본 화면에 목록과 대형 입력 폼을 같이 두는 것
2. 생성과 수정을 같은 큰 폼에서 같이 처리하는 것
3. 관계 설명이 아닌 일반 입력 화면을 2열로 넓히는 것
4. `fleet`를 `company` 문맥 없이 독립 루트처럼 다루는 것
5. 긴 식별자와 내부 식별자를 읽기 화면에 기본 노출하는 것
6. 브라우저 URL에 raw `account_id`, `company_id`, `fleet_id`를 직접 쓰는 것

## 연결 문서

- `repo-map.md`
- `docs/contracts/06-id-and-state-dictionary.md`
- `docs/contracts/09-integration-rules.md`
