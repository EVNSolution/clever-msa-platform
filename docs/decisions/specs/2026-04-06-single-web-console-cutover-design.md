# Single Web Console Cutover Design

## 목적

이 문서는 `front-admin-console`과 `front-operator-console`로 나뉜 현재 웹 구조를, 권한 기반 단일 웹 콘솔로 다시 고정하는 current target truth를 정리한다.

이번 설계의 목표는 아래 다섯 가지다.

1. 웹 런타임을 `front-admin-console` 하나로 통합한다.
2. `admin / operator`를 앱 구분이 아니라 `권한 기반 뷰 분기`로 재해석한다.
3. 최종 웹 진입 경로를 `/` 하나로 고정한다.
4. 기존 `front-operator-console` 기능을 통합 웹으로 이관한다.
5. 이행 중에도 현재 runtime truth와 목표 truth를 섞지 않도록 경계를 명확히 둔다.

## 현재 상태와 문제

cutover 시작 시점의 runtime은 아래처럼 분리되어 있었다.

1. `front-operator-console` -> `/`
2. `front-admin-console` -> `/admin/`

이 구조는 아래 문제를 가진다.

1. 사용자는 결국 같은 계정 체계와 같은 도메인 데이터를 보는데, 앱만 둘로 갈라져 있다.
2. `support`, `announcements`, `drivers`, `vehicles`, `settlements`처럼 실제 화면 경로가 같은데 앱만 달라서 정보 구조가 중복된다.
3. 앞으로 권한이 늘어날수록 `admin web / operator web` 이분법이 오히려 모델을 흐린다.
4. 웹 우선 완성을 목표로 할 때, 두 앱을 동시에 유지하는 비용이 커진다.

즉 지금 필요한 것은 `operator 앱`이 아니라, `하나의 웹에서 권한별로 다른 뷰와 액션을 보여주는 구조`다.

## 선택지 비교

### 1. 현재처럼 두 콘솔 유지

장점:

- 당장 추가 구현이 적다.

단점:

- 이미 사용자 요청과 어긋난다.
- 같은 기능을 두 앱에 중복 구현하게 된다.
- 권한 모델보다 앱 경계가 더 강해져 구조가 흐려진다.

### 2. 단일 콘솔이지만 내부적으로 `admin/operator` 모드를 유지

장점:

- 두 앱을 하나로 합치기만 하면 되므로 겉보기 전환은 쉽다.

단점:

- `admin/operator`라는 오래된 구분을 그대로 남긴다.
- 앞으로도 화면과 문서에서 같은 혼선을 반복한다.

### 3. 권한 기반 단일 콘솔로 완전히 재정의

장점:

- `system_admin / company_super_admin / fleet_manager / vehicle_manager / settlement_manager` 권한 모델과 직접 맞는다.
- 같은 경로에서 `읽기/쓰기/버튼/빈 상태`만 권한에 따라 달라지게 만들 수 있다.
- 중복 앱과 중복 문서를 줄일 수 있다.

단점:

- 기존 `front-operator-console` 기능을 모두 이관해야 한다.
- gateway, compose, rollout 문서를 같이 손봐야 한다.

## 선택된 접근

이번 cutover는 3번을 채택한다.

한 줄로 줄이면 이렇다.

`웹은 front-admin-console 하나로 통합하고, 모든 화면은 권한 기반 단일 콘솔로 다시 정의한다.`

## 최종 웹 current truth

### naming 원칙

1. 사용자-facing 이름은 `통합 웹 콘솔`로 고정한다.
2. `관리자 콘솔`, `운영 콘솔` 같은 split-web 표현은 current truth에서 제거한다.
3. `front-admin-console`, `admin-front` 같은 이름은 repo path와 compose service를 가리키는 기술 식별자로만 남긴다.
4. 즉 이번 cutover는 사용자-facing naming 통합이지, repo/service/container 식별자 rename까지 포함하지 않는다.

### 살아남는 웹

1. 최종 단일 웹 runtime은 `front-admin-console`이다.
2. `front-operator-console`는 이관 완료 후 제거 대상이다.
3. 웹의 최종 base URL은 `/`이다.
4. 기존 `/admin/*` 호환 리다이렉트는 두지 않는다.
5. active runtime inventory에서는 `front-operator-console`를 제거하고 `front-admin-console`만 남긴다.

### 로그인과 public entry

1. 비로그인 첫 화면은 하나만 둔다.
2. 이 화면에서 아래를 함께 처리한다.
   - 로그인
   - 회원가입 요청
   - identity 복구
3. 로그인 후에만 권한에 따라 메뉴와 화면이 갈린다.

### 라우팅 원칙

1. 같은 리소스는 같은 경로 집합만 가진다.
2. `admin 경로`, `operator 경로`를 따로 두지 않는다.
3. 같은 경로에서 아래를 권한 기반으로 분기한다.
   - 메뉴 노출 여부
   - 목록 범위
   - 상세에서 보이는 패널
   - 쓰기 버튼과 액션 가능 여부
   - empty state와 안내 문구

예를 들면 아래처럼 본다.

1. `/support`
   - 권한에 따라 관리자 처리 패널 또는 self-service 패널을 노출
3. `/settlements`
   - 권한에 따라 read-only summary 또는 write 패널을 노출

`notifications` 는 별도 브라우저 route가 아니라 notification hub 기반 backend/runtime capability로 다룬다.
웹에서는 inbox/push 관련 동작이 필요한 문맥에 패널이나 action으로 흡수하고, live route surface로 고정하지 않는다.

## 권한 해석 원칙

웹에서 중요한 구분은 더 이상 `admin / operator`가 아니다.

중요한 것은 아래 두 축이다.

1. `role`
   - `system_admin`
   - `company_super_admin`
   - `fleet_manager`
   - `vehicle_manager`
   - `settlement_manager`
2. `scope`
   - global
   - company scoped
   - self-service only

즉 `operator`라는 말은 "별도 웹 앱"을 뜻하지 않고, 일부 화면에서 `read/self-service 중심 권한 뷰`를 의미하는 표현으로만 남는다.

## 도메인별 화면 이관 원칙

### 그대로 유지되는 화면

이미 `front-admin-console` 기준으로 current truth가 잡힌 화면은 그대로 유지한다.

1. auth / accounts
2. companies / fleets
3. drivers
4. vehicles / vehicle-assignments
5. dispatch
6. settlements

### 흡수되는 화면

현재 `front-operator-console`에만 있던 read/self-service 화면은 통합 웹으로 이관한다.

1. published announcements read
2. self-service support
3. driver summary read
4. vehicle summary read
5. settlement read summary

이관 후에는 같은 route 집합 안에서 권한에 따라 view mode만 달라진다.

## 이행 중 경계 규칙

이행 중에는 아래를 구분한다.

### current runtime truth

1. `current-runtime-inventory.md`는 실제 배포 상태를 적는다.
2. cutover 전까지는 두 front repo가 모두 active runtime일 수 있다.
3. 따라서 runtime inventory는 구현이 완료되기 전까지 성급히 바꾸지 않는다.

### target truth

1. 이 문서와 rollout plan은 목표 구조를 정한다.
2. 구현 완료 후에만 `current-runtime-inventory.md`, compose, gateway 경로를 최종 상태로 바꾼다.

## 구현 원칙

1. 먼저 `front-admin-console`에 operator 기능을 이관한다.
2. 같은 route를 공유하도록 UI와 permission guard를 재구성한다.
3. 충분한 테스트와 build 검증 후에만 `front-operator-console` 제거를 진행한다.
4. gateway와 compose는 최종 cutover 시점에 맞춰 정리한다.

## 완료 기준

아래가 모두 성립하면 cutover 완료다.

1. `front-admin-console` 하나로 웹 운영이 닫힌다.
2. `front-operator-console` 기능이 모두 이관된다.
3. 최종 웹 진입 경로는 `/` 하나다.
4. `/admin/*` 호환 경로는 남기지 않는다.
5. 화면 분기는 `role + scope + self-service 여부`만으로 설명된다.
6. `front-operator-console`는 runtime/workflow에서 제거된다.

## 제외 범위

이번 cutover에서 아래는 하지 않는다.

1. 모바일 앱 repo 구현
2. Kakao SDK/콘솔 연동
3. role 모델 자체의 재설계
4. backend 도메인 경계 변경

이번 작업은 웹 통합 cutover이며, 서비스 경계나 모바일 범위는 그대로 둔다.
