# front-web-console

## Purpose / Boundary

이 repo는 현재 플랫폼의 단일 웹 콘솔 runtime을 소유한다.

현재 역할:
- 권한 기반 웹 shell과 공통 라우팅
- 관리자 CRUD 화면
- lower manager read/self-service 화면
- 단일 웹 API client와 page test

포함:
- React/Vite app
- single-web route와 API client
- page/component test
- host dev server와 containerized static runtime

포함하지 않음:
- gateway 설정
- backend 도메인 로직
- 모바일 앱 UI

주의:
- repo 경로 이름은 `front-web-console`이다.
- 사용자-facing current truth는 `통합 웹 콘솔`이다.
- 별도 `front-operator-console`는 active runtime이 아니라 legacy reference다.

## Runtime Contract / Local Role

- 로컬 개발과 수동 검증은 repo script로 수행한다.
- Docker image는 `npm run dev`를 띄우지 않고, `npm run build` 결과물을 정적으로 서빙한다.
- 세부 실행 방식은 이 README에 고정하지 않는다.

## Local Run / Verification

- 빠른 개발과 수동 검증은 repo script를 사용한다.
- static bundle 검증은 `npm run build`를 사용한다.

## Company Path Shell Contract

- main domain remains the system-admin surface
- company manager sessions are rejected from the main-domain shell
- system-admin sessions can enter a company tenant path before the cockpit shell renders
- canonical company tenant entry is `ev-dashboard.com/{tenant}`
- compatibility host fallback may exist, but it is not the canonical route contract
- company tenant `/` opens the dashboard first
- company tenant login shows the company header
- company tenant launcher order is `대시보드 / 차량 / 정산`
- vehicle workspace is detached like settlement
- vehicle sidebar order is `홈 / 배송원 / 차량 / 차량 배정`
- company cockpit deep links still obey the shared navigation policy redirect rules
- main domain `/vehicles/home` redirects safely to `/vehicles`
- settlement internal menu order is `홈 / 배차 데이터 / 배송원 현황 / 운영 현황 / 정산 처리 / 팀 관리`
- rule-shell behavior is structural only: no persisted editor, no save action, no submit action, and no write API

## Image Build / Deploy Contract

- GitHub Actions workflow 이름은 `Build front-web-console image`다.
- workflow는 immutable `front-web-console:<sha>` 이미지를 ECR로 publish 한다.
- `workflow_dispatch`에서는 optional `vite_api_base_url` input으로 baked API base URL을 줄 수 있다.

## Key Tests Or Verification Commands

- unit/component: `npm run test`
- browser smoke: `npm run test:e2e`

## Manual Verification Matrix

Use this checklist for the company path shell regression pass:

- main domain still shows system-admin surface
- company manager session is rejected from main-domain shell
- system-admin session can enter `/{tenant}` without the blocked-domain panel
- canonical tenant path `/{tenant}` opens dashboard
- company path brand card shows `CLEVER / EV&Solution / 천하운수`
- company path top-level launcher opens to the right of the card
- company path brand card width matches the detached settlement and vehicle sidebar width
- company path global header shows `알림 / 계정` actions on every page
- restricted company-manager deep links under `/drivers`, `/vehicles`, `/vehicle-assignments` redirect to the first allowed cockpit route
- main domain `/vehicles/home` does not open vehicle detail as `vehicleRef='home'`
- vehicle sidebar marks only `홈` active on `/vehicles/home`
- company path settlement menu order matches spec
- `/settlement/dispatch` keeps `업로드 범위 | 업로드 파일` 2열 on wide viewports
- `/settlement/dispatch` switches only the upload scope into a horizontal launcher/expander on narrow viewports
- company path login shows company header

## Root Docs / Runbooks

- `../../docs/contracts/`
- `../../docs/boundaries/`
- `../../docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md`
- `../../docs/runbooks/ev-dashboard-preprod-release-gate.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
