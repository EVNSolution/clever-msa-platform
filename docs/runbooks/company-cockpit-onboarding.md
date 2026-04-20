# Company Cockpit Onboarding

이 문서는 `ev-dashboard.com/{tenant}` 같은 회사 전용 cockpit을 운영 환경에 추가할 때 따르는 표준 runbook 이다.

범위는 아래만 포함한다.

- company tenant metadata 등록
- auth/bootstrap 계약 점검
- frontend cockpit shell 배포 순서
- apex domain 아래 company path tenant 반영
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
- `enabled_features`

천하운수 1차 기준 값은 아래다.

- `company_name`: `천하운수`
- `tenant_code`: `cheonha`
- `workflow_profile`: `cheonha_ops_v1`
## Source Of Truth Checklist

배포 전에 정본이 먼저 준비돼야 한다.

1. `service-organization-registry`에 대상 회사 row가 존재한다.
2. 회사 row에 `tenant_code`, `workflow_profile`, `enabled_features`, `home_dashboard_preset`, `workspace_presets`가 채워져 있다.
3. `GET /org/companies/public/resolve/?tenant_code=<tenant_code>`가 cockpit payload를 반환한다.
4. `service-account-access`가 `GET /auth/workspace-bootstrap/?tenant_code=<tenant_code>`를 제공한다.
5. `workspace-bootstrap` 응답이 회사의 `workflow_profile`과 preset을 반환한다.

여기서 1개라도 비어 있으면 company path tenant를 열지 않는다.

## Runtime Checklist

runtime 쪽에서는 아래를 확인한다.

1. apex domain front runtime이 `/{tenant}` 경로를 그대로 shell bootstrap으로 넘긴다.
2. same-host `/api/*` 요청이 기존 gateway target group으로 향한다.
3. tenant path와 main-domain path가 같은 front/gateway runtime 안에서 충돌 없이 공존한다.
4. `runtime-prod-release`가 front digest를 prod에 반영할 수 있다.

1차 원칙:

- 별도 cockpit host를 만들지 않는다.
- 별도 gateway runtime을 만들지 않는다.
- 같은 apex domain + 같은 front/gateway runtime을 재사용한다.

## Merge And Deploy Order

merge 순서는 아래로 고정한다.

1. `service-organization-registry`
2. `service-account-access`
3. `front-web-console`
4. `runtime-prod-release`

이 순서를 바꾸지 않는 이유는 아래와 같다.

1. organization 이 tenant 정본을 먼저 제공해야 auth/bootstrap이 닫힌다.
2. auth/bootstrap이 먼저 닫혀야 front가 실제 tenant payload로 검증된다.
3. prod release는 마지막에 front digest를 반영해야 rollback과 smoke가 단순하다.

## Release Steps

실행 순서는 아래다.

1. organization, auth, front image build 가 각 repo `main` SHA 기준으로 ECR 에 성공했는지 먼저 확인한다.
2. runtime-prod-release intent가 `ORGANIZATION_IMAGE_URI`, `ACCOUNT_ACCESS_IMAGE_URI`, `FRONT_IMAGE_URI` 대신 각 workload digest를 가리키는지 확인한다.
3. organization 배포 후 app host 컨테이너 image digest 까지 실제로 새 값을 물었는지 확인한다.
4. 그 다음 public resolve endpoint 를 호출해 `tenant_code`가 맞게 해석되는지 확인한다.
5. auth 배포 후 `workspace-bootstrap`이 `workflow_profile`, `enabled_features`, preset을 돌려주는지 확인한다.
6. front 배포 후 메인 허브에는 영향 없이 company path shell 코드가 포함됐는지 확인한다.
7. 외부 smoke를 수행한다.
8. release evidence 와 post-deploy smoke 대상에도 새 company path가 포함됐는지 확인한다.

## Smoke Checklist

아래 순서로 smoke 한다.

1. `https://ev-dashboard.com/<tenant_code>/login` 접속 시 로그인 화면에 회사 전용 caption이 보인다.
2. signup 화면에서 회사 검색/선택이 숨겨진다.
3. 로그인 후 cockpit dashboard 에 `정산 / 차량` launcher가 보인다.
4. `정산` 진입 후 탭 순서가 아래와 같다.
   - `배차 데이터`
   - `배송원 현황`
   - `운영 현황`
   - `정산 처리`
   - `팀 관리`
5. `GET https://api.<candidate-or-prod-domain>/api/org/companies/public/resolve/?tenant_code=<tenant_code>` 가 `200`을 돌려준다.
6. company path 에서 same-host `/api/*` 요청이 `404`가 아니라 기존 backend 응답을 돌려준다.
7. `workspace-bootstrap` 이 로그인된 회사 계정 또는 system admin 으로 `200`을 돌려준다.
8. 기존 `ev-dashboard.com` 메인 허브가 회귀 없이 유지된다.
9. workflow post-deploy smoke 가 apex shell 뿐 아니라 `https://ev-dashboard.com/<tenant_code>/`도 직접 통과한다.

## Rollback

문제가 생기면 아래 순서로 되돌린다.

1. `runtime-prod-release`에서 이전 front digest로 되돌린다.
2. 필요하면 organization 에서 `workflow_profile` 또는 `tenant_code`를 비활성화한다.
3. company path 진입이 닫힌 뒤 front/auth follow-up 을 정리한다.

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
- company path shell 미반영
