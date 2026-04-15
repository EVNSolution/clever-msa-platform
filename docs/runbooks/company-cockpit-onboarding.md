# Company Cockpit Onboarding

이 문서는 `cheonha.ev-dashboard.com` 같은 회사 전용 cockpit을 운영 환경에 추가할 때 따르는 표준 runbook 이다.

범위는 아래만 포함한다.

- company tenant metadata 등록
- auth/bootstrap 계약 점검
- frontend cockpit shell 배포 순서
- infra `COCKPIT_HOSTS` 등록과 DNS/TLS 반영
- smoke checklist

설계 기준:

- [2026-04-15-cheonha-subdomain-cockpit-design.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-15-cheonha-subdomain-cockpit-design.md)
- [2026-04-15-cheonha-cockpit-implementation-plan.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-15-cheonha-cockpit-implementation-plan.md)

## Required Inputs

아래 값이 먼저 닫혀 있어야 한다.

- `company_name`
- `company_id`
- `tenant_code`
- `workflow_profile`
- `cockpit_host`
- `enabled_features`

천하운수 1차 기준 값은 아래다.

- `company_name`: `천하운수`
- `tenant_code`: `cheonha`
- `workflow_profile`: `cheonha_ops_v1`
- `cockpit_host`: `cheonha.ev-dashboard.com`

## Source Of Truth Checklist

배포 전에 정본이 먼저 준비돼야 한다.

1. `service-organization-registry`에 대상 회사 row가 존재한다.
2. 회사 row에 `tenant_code`, `workflow_profile`, `enabled_features`, `home_dashboard_preset`, `workspace_presets`가 채워져 있다.
3. `GET /org/companies/public/resolve/?tenant_code=<tenant_code>`가 cockpit payload를 반환한다.
4. `service-account-access`가 `GET /auth/workspace-bootstrap/?tenant_code=<tenant_code>`를 제공한다.
5. `workspace-bootstrap` 응답이 회사의 `workflow_profile`과 preset을 반환한다.

여기서 1개라도 비어 있으면 서브도메인을 열지 않는다.

## Infra Checklist

infra 쪽에서는 아래를 확인한다.

1. Route53 hosted zone 이 `cockpit_host`를 수용할 수 있다.
2. `infra-ev-dashboard-platform` deploy env에 `COCKPIT_HOSTS`가 포함된다.
3. ALB certificate SAN에 `cockpit_host`가 포함되도록 합성된다.
4. Route53 alias record 가 같은 public ALB를 가리킨다.
5. same-host `/api/*` 요청이 기존 gateway target group으로 향한다.

1차 원칙:

- host별 별도 ALB를 만들지 않는다.
- host별 별도 gateway runtime을 만들지 않는다.
- 같은 ALB + 같은 front/gateway runtime을 재사용한다.

## Merge And Deploy Order

merge 순서는 아래로 고정한다.

1. `service-organization-registry`
2. `service-account-access`
3. `front-web-console`
4. `infra-ev-dashboard-platform`

이 순서를 바꾸지 않는 이유는 아래와 같다.

1. organization 이 tenant 정본을 먼저 제공해야 auth/bootstrap이 닫힌다.
2. auth/bootstrap이 먼저 닫혀야 front가 실제 tenant payload로 검증된다.
3. infra는 마지막에 host를 외부로 노출해야 rollback과 smoke가 단순하다.

## Release Steps

실행 순서는 아래다.

1. organization 배포 후 public resolve endpoint 를 호출해 `tenant_code`가 맞게 해석되는지 확인한다.
2. auth 배포 후 `workspace-bootstrap`이 `workflow_profile`, `enabled_features`, preset을 돌려주는지 확인한다.
3. front 배포 후 메인 허브에는 영향 없이 cockpit shell 코드가 포함됐는지 확인한다.
4. infra 배포 전 `COCKPIT_HOSTS`에 새 host를 추가한다.
5. infra deploy 후 certificate, listener rule, Route53 alias가 반영됐는지 확인한다.
6. 외부 smoke를 수행한다.
7. deploy workflow env export 와 post-deploy smoke 대상에도 새 cockpit host가 포함됐는지 확인한다.

## Smoke Checklist

아래 순서로 smoke 한다.

1. `https://<cockpit_host>` 접속 시 로그인 화면에 회사 전용 caption이 보인다.
2. signup 화면에서 회사 검색/선택이 숨겨진다.
3. 로그인 후 cockpit dashboard 에 `정산 / 차량 / 빈 카드 / 빈 카드`가 보인다.
4. `정산` 진입 후 탭 순서가 아래와 같다.
   - `배차 데이터`
   - `배송원 관리`
   - `운영 현황`
   - `정산 처리`
   - `팀 관리`
5. cockpit host 에서 `/api/*` 요청이 404가 아니라 기존 backend 응답을 돌려준다.
6. 기존 `ev-dashboard.com` 메인 허브가 회귀 없이 유지된다.
7. workflow post-deploy smoke 가 apex shell 뿐 아니라 `https://<cockpit_host>/`도 직접 통과한다.

## Rollback

문제가 생기면 아래 순서로 되돌린다.

1. `infra-ev-dashboard-platform`에서 대상 host를 `COCKPIT_HOSTS`에서 제거한다.
2. infra deploy 로 certificate SAN / Route53 alias / listener host binding 을 되돌린다.
3. 필요하면 organization 에서 `workflow_profile` 또는 `tenant_code`를 비활성화한다.
4. cockpit host 가 닫힌 뒤 front/auth follow-up 을 정리한다.

## Handoff Notes

PR 본문에는 아래를 반드시 남긴다.

- dependency PR
- deploy order
- smoke evidence
- rollback point
- hidden dependency

hidden dependency 예시는 아래다.

- organization 회사 metadata 미입력
- auth `workspace-bootstrap` 미배포
- infra `COCKPIT_HOSTS` 누락
