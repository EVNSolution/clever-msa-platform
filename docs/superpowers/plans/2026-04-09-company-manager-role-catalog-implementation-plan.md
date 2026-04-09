# Company Manager Role Catalog Implementation Plan

## Goal

기존 `전역 manager_role` 기반 관리자 네비게이션 정책을 `회사별 관리자 역할 카탈로그` 모델로 전환한다.

이번 계획은 아래 두 축을 함께 다룬다.

1. 백엔드 역할/정책 모델 전환
2. 프론트 정책 편집 화면을 `회사 선택 + 역할 선택` 기반으로 재편

## Phase 0. Local UI Prototype First

목표:

- `front-web-console`에서 새 역할 모델의 화면 구조를 로컬 전용 프로토타입으로 먼저 확정
- 아직 저장 API는 붙이지 않음

작업:

1. `/admin/menu-policy` 상단을 `회사 선택 + 역할 선택`으로 변경
2. 선택 역할 요약 카드 제거
3. 향후 `역할 추가 / 이름 변경 / 삭제` 영역이 들어갈 자리를 확보
4. 시스템 관리자 기준으로만 우선 동작
5. 실제 회사 목록은 기존 company API를 재사용

산출물:

- 로컬 UX 기준 확정
- 배포 없음

## Phase 1. Backend Role Catalog

대상 repo:

- `development/service-account-access`

작업:

1. `CompanyManagerRole` 모델 추가
2. company 생성 시 기본 역할 4개 시드 로직 추가
3. 역할 CRUD 서비스 추가
4. 삭제 제한 규칙 추가
   - `company_super_admin` 삭제 금지
   - 배정된 역할 삭제 금지
5. 역할별 `allowed_nav_keys` 저장 모델 추가

테스트 우선:

- 기본 역할 자동 생성 RED/GREEN
- 삭제 제한 RED/GREEN
- 이름 변경 RED/GREEN
- 정책 저장 RED/GREEN

## Phase 2. Auth / Token Migration

대상 repo:

- `development/service-account-access`

작업:

1. 로그인 principal에 `active_company_manager_role_id` 추가
2. JWT claim에 아래 추가
   - `active_company_id`
   - `active_company_manager_role_id`
   - `active_company_manager_role_code`
   - `allowed_nav_keys`
3. 기존 `manager_role` claim은 compatibility 유지 후 deprecated

테스트 우선:

- 로그인 응답 claim RED/GREEN
- 기존 계정 호환성 RED/GREEN

## Phase 3. Admin APIs

대상 repo:

- `development/service-account-access`

작업:

1. 회사 목록 조회 재사용 또는 권한 정리
2. 회사별 역할 목록 조회 API
3. 역할 생성 API
4. 역할 이름 변경 API
5. 역할 삭제 API
6. 역할별 메뉴 정책 조회/저장 API

권한:

- system_admin: 모든 회사 허용
- company_super_admin: 자기 회사만 허용

테스트 우선:

- 시스템 관리자 전체 회사 접근 RED/GREEN
- 회사 전체 관리자 타 회사 차단 RED/GREEN
- 삭제 제한 에러 응답 RED/GREEN

## Phase 4. Front Integration

대상 repo:

- `development/front-web-console`

작업:

1. 로컬 프로토타입을 실제 API 연결 UI로 전환
2. 회사 선택 드롭다운 연결
3. 역할 선택 드롭다운 연결
4. 역할 추가 / 이름 변경 / 삭제 UI 연결
5. 삭제 불가 사유 명시
6. 편집/미리보기는 기존 구조 재사용

테스트 우선:

- company selector RED/GREEN
- role selector RED/GREEN
- add/rename/delete UX RED/GREEN
- protected role delete blocked RED/GREEN

## Phase 5. Authorization Expansion

작업:

1. API authorization helper를 새 role claim 기준으로 전환
2. 기존 `manager_role` 기반 helper를 점진적으로 제거
3. `allowed_nav_keys` 기반 `view` authorization 계속 확장

주의:

- action은 아직 `view` 중심
- `edit/approve/assign`는 다음 단계에서 확장

## Phase 6. Data Migration and Cutover

작업:

1. 기존 전역 역할 정책을 회사별 기본 역할 정책으로 복제
2. 기존 관리자 계정을 새 회사 역할 레코드에 매핑
3. 운영 계정 샘플 점검
4. old policy API deprecation 표시

## Risks

1. 기존 manager account가 전역 role_type 문자열만 갖고 있을 가능성
2. 회사별 역할 시드와 기존 계정 연결 순서가 꼬이면 로그인 claim이 깨질 수 있음
3. front와 auth migration 타이밍이 어긋나면 권한 UI가 깨질 수 있음

## Rollout Strategy

1. spec 고정
2. local UI prototype 확정
3. backend model + API 구현
4. front 실제 연결
5. local integrated verification
6. service repo build only
7. central deploy only

## Immediate Next Step

지금 즉시 할 일은 Phase 0이다.

- `/admin/menu-policy`를 `회사 선택 + 역할 선택` 로컬 프로토타입으로 바꾼다.
- 이 단계에서는 persistence/API contract를 건드리지 않는다.
