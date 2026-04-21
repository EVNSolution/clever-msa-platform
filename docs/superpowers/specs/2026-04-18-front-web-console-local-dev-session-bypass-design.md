# Front Web Console Local Dev Session Bypass Design

## Purpose

이 문서는 `front-web-console`에서 **사람이 직접 브라우저로 눌러보는 로컬 웹 테스트 환경**을 정의한다.

목표는 아래를 동시에 만족하는 것이다.

1. 로그인 절차 없이 메인 도메인과 서브도메인 shell을 빠르게 확인할 수 있어야 한다.
2. 실제 버튼 클릭, 폼 입력, 페이지 이동은 정상 제품처럼 동작해야 한다.
3. 실제 DB나 원격 API를 치지 않아도 된다.
4. production 경로와 명확히 분리되어야 한다.

## Scope

이번 문서는 아래만 다룬다.

- `front-web-console` 로컬 dev 수동 검증용 우회 진입
- `hosts` 파일 기반 메인/서브도메인 문맥 테스트
- dev 전용 세션 preset 주입
- dev 전용 mock API 동작 계층

이번 문서는 아래를 다루지 않는다.

- production 로그인 흐름 변경
- backend 인증/세션 계약 변경
- 서브도메인 제품 IA 자체 변경
- Playwright 등 자동화 테스트 플로우

## Problem Statement

현재 `front-web-console`은 아래 세 가지 제약 때문에 로컬 수동 검증이 번거롭다.

1. 로그인 과정을 반드시 지나야 한다.
2. 서브도메인 shell은 `*.ev-dashboard.com` host 문맥이 필요하다.
3. 실제 API를 그대로 붙이면 데이터 안전성이 깨지거나, 화면 확인만 하려는 목적에 비해 비용이 크다.

이 상태에서는 메인 도메인과 `cheonha` 서브도메인 shell을 사람 기준으로 빠르게 눌러보는 로컬 검증 환경을 만들기 어렵다.

## Current Constraints

현재 프론트의 핵심 제어점은 아래다.

- 세션 저장:
  - [development/front-web-console/src/sessionPersistence.ts](../../../development/front-web-console/src/sessionPersistence.ts)
- 서브도메인 host 해석:
  - [development/front-web-console/src/tenant/resolveTenantEntry.ts](../../../development/front-web-console/src/tenant/resolveTenantEntry.ts)
- dev 프록시:
  - [development/front-web-console/vite.config.ts](../../../development/front-web-console/vite.config.ts)

현재 host 해석 규칙은 `localhost`를 회사 서브도메인으로 보지 않는다. 따라서 로컬 서브도메인 테스트는 **host 자체를 맞춰서 들어가야 한다.**

## Approaches Considered

### 1. Localhost query param 우회

예: `http://localhost:5174/?devSession=cheonha_manager`

장점:

- 구현이 가장 작다.

단점:

- 현재 host 기반 서브도메인 문맥과 어긋난다.
- 메인/서브도메인 제품 경계를 실제와 다르게 테스트하게 된다.
- 사람이 쓰는 규칙이 애매해진다.

채택하지 않는다.

### 2. 로컬 스크립트로 localStorage만 주입

북마클릿, 콘솔 스크립트, 별도 로컬 파일로 세션을 심는 방식이다.

장점:

- 앱 코드를 거의 건드리지 않아도 된다.

단점:

- 팀 공용 dev 기능으로 쓰기 불편하다.
- 도메인 문맥과 세션 preset을 일관되게 관리하기 어렵다.
- 사람이 반복해서 쓰기 번거롭다.

채택하지 않는다.

### 3. `hosts` + dev-only session route + dev mock layer

실제 host를 로컬로 연결하고, dev에서만 열리는 세션 주입 route와 mock API 계층을 함께 두는 방식이다.

장점:

- 실제 메인/서브도메인 문맥을 그대로 테스트할 수 있다.
- 사람이 직접 쓰기 쉽다.
- 실제 API/DB 영향 없이 shell과 상호작용을 빠르게 검증할 수 있다.

단점:

- dev-only route와 mock 계층을 명시적으로 관리해야 한다.

이번 문서는 이 방식을 채택한다.

## Primary Decision

로컬 웹 테스트 우회환경은 아래 조합으로 고정한다.

1. `hosts` 파일로 메인/서브도메인 host를 `127.0.0.1`에 연결한다.
2. `front-web-console`에 **`local-sandbox` 전용** 세션 주입 route를 둔다.
3. 같은 환경에서만 동작하는 **mock API 계층**을 둔다.
4. production build와 실서비스에서는 이 기능이 절대 노출되지 않도록 차단한다.

## Activation Contract

이 기능의 활성화 계약은 아래로 고정한다.

- `npm run dev`
  - 이 기능 비활성
- `npm run dev:local-sandbox`
  - 이 기능 활성

즉 기존 `local-test`와 새 `local-sandbox`를 섞어서 해석하지 않는다.

1차 canonical mode:

- `local-test` = **safer remote dev/staging proxy 모드**
- `local-sandbox` = **완전한 프론트 mock-only 수동 테스트 모드**

이 모드에서는 아래가 동시에 켜진다.

1. `/__dev__/session`
2. host별 preset session 주입
3. `/api` 전면 mock

이 모드에서는 아래가 꺼진다.

1. 원격 dev/staging target 프록시 사용
2. 실제 API 호출
3. production과 동일한 로그인 요구

## Host Contract

1차 로컬 지원 host는 아래 두 개로 고정한다.

- `ev-dashboard.com`
- `cheonha.ev-dashboard.com`

로컬 `hosts` 예시:

```txt
127.0.0.1 ev-dashboard.com
127.0.0.1 cheonha.ev-dashboard.com
```

이 매핑이 없으면 브라우저는 public DNS를 사용하므로, local-sandbox shell은 local `5174`로 열리지 않는다.

개발 서버는 그대로 `5174`를 사용한다.

접속 예시:

- `http://ev-dashboard.com:5174`
- `http://cheonha.ev-dashboard.com:5174`

즉 `localhost`가 아니라 **실제 host 기반 문맥**으로 테스트한다.

Browser note:

- `local-sandbox`는 `http://...:5174` plain HTTP다.
- `ev-dashboard.com` 계열 host를 브라우저가 HSTS로 기억하고 있으면 HTTPS 강제 승격 때문에 local-sandbox가 열리지 않을 수 있다.
- 이 경우 fresh browser profile을 쓰거나 도메인의 HSTS state를 지우는 쪽이 우선이다.

## Dev Session Route

세션 우회 진입 route는 아래로 고정한다.

- `/__dev__/session`

예:

- `http://ev-dashboard.com:5174/__dev__/session`
- `http://cheonha.ev-dashboard.com:5174/__dev__/session`

원칙:

- 앱 일반 메뉴에서는 이 route를 노출하지 않는다.
- 사용자는 주소 직접 입력으로만 접근한다.
- route는 `local-sandbox`에서만 활성화된다.
- production build에서는 route 자체가 막혀야 한다.

## Preset Session Model

1차 preset은 두 개만 둔다.

- `system_admin`
- `cheonha_manager`

host별 허용 preset:

- `ev-dashboard.com`
  - `system_admin`
- `cheonha.ev-dashboard.com`
  - `cheonha_manager`

즉 host와 세션 preset을 교차 노출하지 않는다.

주입 방식:

- 기존 [sessionPersistence.ts](../../../development/front-web-console/src/sessionPersistence.ts) 저장 구조를 그대로 사용한다.
- `세션 주입` 버튼을 누르면 preset `SessionPayload`를 local storage에 기록한다.
- Safari나 stricter site-data policy가 local storage write를 거부하면, sandbox session은 in-memory fallback으로 유지되어야 한다.
- 완료 후 `/`로 이동한다.
- `세션 초기화` 버튼은 아래를 전부 지운다.
  - 저장 세션
  - dev preset 상태
  - mock API 메모리 상태
- 초기화 후에는 로그인되지 않은 깨끗한 `local-sandbox` 상태로 돌아간다.

## Dev Session Page UX

이 페이지는 최대한 단순하게 둔다.

표시 요소:

- 현재 host
- 현재 허용 preset 이름
- `세션 주입`
- `세션 초기화`

의도적으로 넣지 않는 것:

- 일반 앱 네비게이션
- 복잡한 설명 문구
- 다중 회사 선택기
- 운영용 기능

## Mock API Layer

이 환경은 단순 로그인 우회만으로는 충분하지 않다. 실제 동작 테스트를 하려면 화면이 읽고 쓰는 데이터도 안전해야 한다.

따라서 1차는 **브라우저 내부 dev mock layer**를 둔다.

원칙:

- `local-sandbox`에서만 활성화
- `/api` 요청은 예외 없이 전부 mock으로 처리
- 브라우저 mock interception이 `fetch` 단계에서 먼저 잡고, Vite dev proxy까지 요청이 내려가면 안 된다
- 실제 `/api` 프록시 사용은 금지
- 메모리 기반 데이터로 폼 제출, 목록 갱신, 상태 전이를 흉내 낸다
- 브라우저 새로고침 전까지는 상태가 유지될 수 있어도 된다

1차 interception 범위:

- auth/session 관련 요청
- workspace/bootstrap 관련 요청
- 목록 조회 요청
- 생성/수정/삭제 요청

즉 `local-sandbox`는 네트워크 성공 여부에 따라 일부만 mock하는 모드가 아니라, **프론트가 보는 `/api` surface 전체를 mock layer가 책임지는 모드**다.
기존 `dev:local-test`의 safer remote proxy 의미는 그대로 유지하고, 이 mock layer는 그 계약을 대체하지 않는다.

1차 fidelity 범위:

- client-side route 이동
- 도메인별 shell 분기
- 세션 기반 접근 제어
- 폼 입력/제출
- 화면 목록 갱신
- mock data mutation 이후의 재렌더

1차에서 의도적으로 포함하지 않는 것:

- 실제 backend 인증
- 실제 gateway/edge behavior
- 실제 cookie/refresh token flow
- 실제 DB consistency 검증

1차 목적:

- 사람이 메인 도메인/천하 서브도메인 shell을 직접 눌러본다
- 탭 이동, 입력, 저장, 목록 반영을 확인한다
- 실제 DB에는 영향을 주지 않는다

## Security Rules

이 기능은 아래 규칙을 반드시 따른다.

1. production build에서는 접근 불가
2. `local-sandbox` 이외 환경에서는 route 비활성
3. host별 preset 고정
4. 메인 도메인과 서브도메인의 기존 권한 경계는 유지
5. 일반 사용자 메뉴에서 dev route를 노출하지 않음
6. `local-sandbox`에서는 `/api` 실호출 금지

## Hosts Safety Rules

`hosts` 방식은 간단하지만, 실 host를 로컬에 꽂는 만큼 안전 수칙을 같이 둔다.

1. 테스트 종료 후 `hosts` 항목을 제거할 수 있어야 한다.
2. 팀 문서에 브라우저 프로필 분리를 권장한다.
3. `local-sandbox`는 mock-only이므로, `hosts`가 남아 있어도 실제 DB 호출로 이어지지 않아야 한다.
4. service worker, real cookie, production session reuse에 의존하지 않는다.

즉 이 설계는 `hosts`의 운영 리스크를 **mock-only `local-sandbox`**로 줄이는 방식이다.

## Disable and Rollback

비활성 기준은 단순해야 한다.

1. `npm run dev`로 실행하면 이 기능은 보이지 않는다.
2. `npm run build` 결과물에는 `/__dev__/session`이 포함되지 않는다.
3. 필요 시 `local-sandbox` gate 하나를 끄면 session route와 mock layer가 함께 사라진다.

즉 이것은 **팀 공용 개발 보조 기능**이지, 제품 기능이 아니다.

## Success Criteria

아래를 만족하면 1차 목적을 달성한 것으로 본다.

1. `hosts` 설정 후 `ev-dashboard.com:5174`와 `cheonha.ev-dashboard.com:5174`에서 각각 다른 shell을 확인할 수 있다.
2. `__dev__/session`에서 host별 허용 preset만 주입할 수 있다.
3. 로그인 절차 없이 `/`로 진입해도 원하는 shell이 열린다.
4. 주요 상호작용은 실제처럼 동작하지만 실제 API/DB 영향은 없다.
5. production 경로에서는 이 기능이 노출되지 않는다.

## Verification Checklist

구현 후 최소 검증 항목:

1. `npm run dev`에서는 `/__dev__/session` 접근 불가
2. `npm run dev:local-sandbox`에서는 `/__dev__/session` 접근 가능
3. `ev-dashboard.com:5174/__dev__/session`에서는 `system_admin`만 노출
4. `cheonha.ev-dashboard.com:5174/__dev__/session`에서는 `cheonha_manager`만 노출
5. `local-sandbox` 실행 중 `/api`가 실제 네트워크로 나가지 않음
6. `세션 초기화` 후 세션/preset/mock state가 모두 초기화됨
7. production build 결과물에서 dev route와 `local-sandbox` mock entry가 노출되지 않음

## Out of Scope Follow-Ups

이번 문서 이후 별도 과제로 다룰 수 있는 것:

- Playwright 기반 dev preset 자동 시나리오
- `cheonha` 외 다른 회사 preset 추가
- mock data reset/import/export
- 역할별 더 세분화된 preset 추가
