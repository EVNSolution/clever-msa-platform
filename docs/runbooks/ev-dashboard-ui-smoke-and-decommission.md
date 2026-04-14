# ev-dashboard UI Smoke And Decommission

이 문서는 `ev-dashboard.com` ECS migration 이후, 남은 UI 확인과 old EC2/compose 경로 정리를 어떤 순서로 닫을지 고정한다.

## Current Truth

`2026-04-14` 기준:

- `ev-dashboard.com` 은 `front-web-console` ECS/ALB 경로에서 응답한다.
- `api.ev-dashboard.com` 의 planned external prefix 는 ECS/ALB 경로에서 production proof를 마쳤다.
- `service-telemetry-listener` 는 `Slice 7b` 로 남아 있고 `desired=0` 이다.

즉 public web/API surface는 대부분 ECS로 넘어갔고, 남은 것은:

1. authenticated UI smoke close-out
2. internal telemetry listener cutover
3. old EC2/compose dependency retire

## Current Closure Status

### Already Closed

- `ev-dashboard.com` public shell은 ECS/ALB 경로에서 production proof를 마쳤다.
- `api.ev-dashboard.com` planned external prefixes는 ECS/ALB 경로에서 production proof를 마쳤다.
- production operational admin identity는 생성되어 authenticated browser smoke의 emergency fallback으로는 사용할 수 있다.
- dedicated manager-role smoke accounts exist and are recorded only in local gitignored operator notes.
- authenticated read-only browser smoke passed for the required pages.

### Still Open

- `service-telemetry-listener` `7b`
- old EC2/compose path의 `ev-dashboard` 범위 retire

### Honest Blockers

- `service-telemetry-listener` 에 필요한 real MQTT broker truth가 아직 고정되지 않았다.
- dedicated smoke credential은 만들었지만 secret-managed steady state는 아직 아니다. 현재 운영 메모는 local-only gitignored note를 사용한다.
- 따라서 지금은 “authenticated UI smoke complete”까지 닫혔고, “full operational decommission complete”는 아니다.

## UI Smoke Levels

### 1. Anonymous Shell Smoke

이 단계는 지금 바로 가능하다. 목표는 public front door가 깨지지 않았다는 것을 증명하는 것이다.

Expected proof:

- `https://ev-dashboard.com/` title is `CLEVER 통합 웹 콘솔`
- login heading visible
- email/password inputs visible
- protected routes like `/companies`, `/dispatch/boards` return to the login shell when unauthenticated
- browser console has no unexpected `error` messages during that shell smoke

`2026-04-14` evidence:

- title `CLEVER 통합 웹 콘솔`
- `/companies` -> `https://ev-dashboard.com/`
- `/dispatch/boards` -> `https://ev-dashboard.com/`
- no browser console errors

### 2. Authenticated Read-Only Smoke

이 단계는 `2026-04-14` 기준으로 닫혔다. 회사 전체 관리자 smoke 계정으로 로그인 후 주요 read-only 화면을 실제 browser flow로 확인했다.

Required pages:

- `회사·플릿`
- `배송원`
- `차량`
- `차량 배정`
- `인사문서`
- `배차 계획`
- `정산 운영 요약`
- `권역`
- `공지`

Rules:

- prod에서는 read-only 확인만 한다.
- 생성/수정/삭제 버튼 smoke는 별도 승인 없이는 하지 않는다.
- local fixture credential을 그대로 prod에 쓰지 않는다.
- 운영용 full-admin credential은 emergency fallback으로만 쓴다.

Current evidence:

- repo default smoke credential은 더 이상 쓰지 않는다.
- dedicated manager-role smoke credential은 local-only gitignored note에 보관한다.
- `2026-04-14` authenticated browser smoke paths:
  - `/companies`
  - `/companies/1`
  - `/companies/1/fleets/1`
  - `/drivers`
  - `/vehicles`
  - `/vehicle-assignments`
  - `/personnel-documents`
  - `/dispatch/boards`
  - `/settlements/overview`
  - `/regions`
  - `/announcements`
- all required pages rendered without browser console errors.

Closure requirement:

- dedicated read-only 또는 최소권한 smoke account 유지
- 그 계정으로 Playwright 또는 equivalent browser smoke 성공
- smoke에 사용한 credential source를 runbook 또는 secret owner 메모에 남김

### 3. Write Smoke

prod write UI smoke는 기본 금지다. 정말 필요하면:

- 별도 승인
- 대상 entity 범위 명시
- cleanup 계획 명시

없으면 read-only smoke까지만 한다.

## Decommission Gate

old EC2/compose 경로를 줄이거나 제거하기 전에 아래가 모두 참이어야 한다.

1. `api.ev-dashboard.com` external prefix가 ECS에서 production proof를 마쳤다.
2. `ev-dashboard.com` anonymous shell smoke가 통과한다.
3. authenticated read-only UI smoke가 dedicated smoke account로 통과한다.
4. `service-telemetry-listener` cutover 여부가 명시돼 있다.
5. old runtime이 다시 Route53 또는 public ingress를 점유하지 못한다.

현재 상태 판정:

- `1`, `2`, `3`, `5` 는 충족
- `4` 는 미충족

## Decommission Sequence

### Phase A. Freeze The Public Surface

- `ev-dashboard.com` 과 `api.ev-dashboard.com` 은 ECS/ALB 경로만 정답으로 취급한다.
- old runtime이 DNS 또는 direct public IP를 다시 점유하지 못하는지 확인한다.
- current ECS lesson/runbook 링크를 closure packet에 묶는다.

### Phase B. Close UI Smoke Honestly

- dedicated read-only smoke account를 만든다.
- browser-based authenticated smoke를 수행한다.
- 결과를 root `lesson.md` 와 이 runbook에 반영한다.
- current operator flow keeps the credential in a local gitignored note; secret-managed storage is still preferred if the ownership model changes later.

### Phase C. Retire ev-dashboard Scope From Old EC2 Path

`clever-deploy-control` 과 old compose path에서 아래를 점검한다.

- `ev-dashboard` public web/API surface를 계속 배포하거나 restart하는 step이 남아 있는지
- old host가 `ev-dashboard.com` 또는 `api.ev-dashboard.com` 트래픽에 실질적으로 개입하는지
- ECS로 넘어간 slice repo가 old compose service로도 계속 기동되는지

정리 원칙:

- public ingress owner는 ECS/ALB로 단일화
- old host path는 restart해도 `ev-dashboard` public surface에 영향이 없어야 함
- restart 한 번으로 DNS나 public host ownership이 뒤집히면 decommission 불가

### Phase D. Defer Telemetry Listener Until Broker Truth Is Known

`service-telemetry-listener` 는 `7b` 이다.

- 실제 MQTT broker endpoint
- credentials
- network path
- CloudWatch/ECS verification

이 네 가지가 확인되기 전에는 old ingest path를 섣불리 제거하지 않는다.

## Minimal Next Actions

1. `service-telemetry-listener` 의 broker truth를 고정한다.
2. old EC2/compose path에서 `ev-dashboard` public surface 관련 step을 실제로 제거하거나 no-op임을 증명한다.
3. 필요하면 local-only smoke credential을 secret-managed 운영 방식으로 승격할지 결정한다.

## Minimal Closure Packet

이 migration을 operationally close할 때는 아래 evidence를 같이 남긴다.

- latest successful infra workflow URL
- `EvDashboardPlatformStack` latest success status
- anonymous shell smoke evidence
- authenticated read-only smoke evidence
- `service-telemetry-listener desired=0` 또는 cutover success evidence
- decommission impact note for old EC2/compose path
