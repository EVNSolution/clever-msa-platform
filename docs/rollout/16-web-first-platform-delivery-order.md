# 16. Web-First Platform Delivery Order

## 문서 목적

이 문서는 현재 CLEVER 전체 구현에서 `웹 우선 완성`을 1차 목표로 고정하고, 앱/Kakao는 전체 프로젝트 후순위로 내리는 current rollout truth를 정리한다.

이 문서의 목적은 아래 네 가지다.

1. `웹 1차 완성`의 범위를 명확히 고정한다.
2. 남은 구현을 `웹 우선` 순서로 정렬한다.
3. 앱/Kakao를 auth만의 2차가 아니라 플랫폼 전체 2차로 고정한다.
4. active checklist를 한 장에서 관리할 수 있게 한다.

## 현재 원칙

1. 현재 1차 목표는 `앱 없이도 웹만으로 운영이 닫히는 상태`다.
2. `front-admin-console`, `front-operator-console`가 현재 플랫폼의 주 사용자 경로다.
3. 앱 repo 구현과 Kakao SDK/콘솔 연동은 필요하지만, 현재 라운드의 blocker가 아니다.
4. 앱/Kakao는 `auth 2차`가 아니라 `플랫폼 전체 2차`다.

## 1차 완성 정의

아래가 모두 충족되면 `웹 1차 완성`으로 본다.

1. 관리자 운영은 `front-admin-console`만으로 가능하다.
2. 운영자 조회/보조 업무는 `front-operator-console`만으로 가능하다.
3. 신규 사용자 진입, 승인, 계정 관리, 회사 변경이 웹에서 닫힌다.
4. 핵심 업무 도메인의 목록, 상세, 생성/수정, 운영 액션이 웹에서 닫힌다.
5. 앱이 없어도 실제 운영 업무가 막히지 않는다.

## 현재 완료된 웹 기반선

현재 아래 영역은 1차 기준으로 정리 완료 또는 기반선이 충분하다.

1. `auth`
2. `accounts`
3. `companies`
4. `drivers`
5. `vehicles`
6. `vehicle-assignments`
7. `settlements`

현재 의미는 `웹 urgent 범위의 바닥은 이미 깔렸다`는 뜻이다.  
이후 작업은 남은 도메인 구현과 운영 polish를 닫는 순서로 간다.

## Phase 1. Web-First Delivery Checklist

### 1. Web auth and admin polish

- [ ] `system_admin`, `company_super_admin`, `vehicle_manager`, `settlement_manager`별로 보이는 액션을 완전히 정리
- [ ] request 관리 화면의 상태 문구, 에러 문구, setup 단계 문구를 운영형으로 다듬기
- [ ] 회사 변경 UX를 웹에서 자연스럽게 마감
- [ ] self-service와 관리자 액션 경계를 화면에서 명확히 분리

이 단계의 목적은 이미 올라온 auth와 계정 관리 기능을 `운영형 UX`로 닫는 것이다.

### 2. Dispatch web

- [ ] `front-admin-console` 기준 `company + fleet + dispatch_date` 배차 보드 흐름을 닫기
- [ ] `dispatch_plan`의 예상 물량 입력/수정 화면을 닫기
- [ ] 날짜별 `dispatch unit board`와 배차 CRUD를 웹에서 운영 가능하게 만들기
- [ ] 용차 기사와 날짜 예외(`휴무`, `특근`) 입력을 배차 보드에 붙이기
- [ ] 정본과 read-model/broker 경계를 문서와 구현에서 일치시키기

이 단계는 차량, 배송원, 정산 다음 운영 핵심을 웹에서 닫기 위한 우선순위 1위 도메인이다.

### 3. Announcement / support / notification web

- [ ] `service-announcement-registry` 기준 공지 운영 화면 닫기
- [ ] `service-support-registry` 기준 문의/지원 운영 화면 닫기
- [ ] `service-notification-hub` 기준 알림 운영 화면 닫기
- [ ] 앱 부재를 보완하는 웹 운영 경로를 완성하기

앱이 아직 없기 때문에 이 세 영역은 웹 대체 경로로서 우선순위가 높다.

### 4. Region web

- [ ] `service-region-registry` 기준 권역 기준 화면 닫기
- [ ] `service-region-analytics` 기준 권역 분석 화면 닫기
- [ ] 지도/표/요약 등 웹 운영에 필요한 read 중심 UX를 마감하기

이 단계는 운영 보조와 분석 기능을 웹 기준으로 닫는다.

### 5. Personnel document web

- [ ] `service-personnel-document-registry` 기준 문서 메타데이터 화면 닫기
- [ ] 업로드/조회/상태 관리 기준을 웹에서 정리하기

이 영역은 중요하지만, 위 1~4보다 운영 차단 효과가 한 단계 낮으므로 뒤에 둔다.

### 6. Final web verification

- [ ] admin/operator 권한별 smoke 시나리오 점검
- [ ] 핵심 도메인 route, route_no, 세션, 승인 흐름 회귀 점검
- [ ] 문서 audit와 실제 구현 상태를 다시 맞추기
- [ ] 필요 시 `docs/rollout/14-front-ui-rule-audit.md` 갱신

이 단계가 끝나면 `웹 1차 완성`으로 판정한다.

## Phase 2. Deferred After Web Completion

아래는 `웹 1차 완성` 이후로 내린다.

1. 모바일 앱 repo 구현
2. 앱 로그인/가입/대기/복구 UX
3. Kakao Developers 콘솔 실제 설정
4. Kakao SDK 연동
5. 앱 client 테스트
6. 앱 smoke/E2E

즉 앱/Kakao는 중요하지만, 현재 라운드의 선행 조건이 아니다.

## 운영 규칙

1. 새로운 구현 착수 전, 먼저 이 문서 기준으로 `웹 1차 / 앱 2차` 우선순위를 확인한다.
2. 앱/Kakao 작업은 `웹 1차`를 직접 막는 경우가 아니면 다시 끌어올리지 않는다.
3. 새로운 도메인 구현도 먼저 웹 기준으로 닫을 수 있는지부터 판단한다.
4. 개별 구현 계획 문서는 이 문서의 순서를 따른다.
5. 이 문서는 living rollout truth이며, 현재 우선순위가 바뀌면 직접 갱신한다.

## 연결 문서

- [15-ui-first-working-mode.md](15-ui-first-working-mode.md)
- [14-front-ui-rule-audit.md](14-front-ui-rule-audit.md)
- [../contracts/10-front-ui-rules.md](../contracts/10-front-ui-rules.md)
- [../contracts/15-auth-api-scenario-map.md](../contracts/15-auth-api-scenario-map.md)
- [../../WORKSPACE.md](../../WORKSPACE.md)
- [../../repo-map.md](../../repo-map.md)
