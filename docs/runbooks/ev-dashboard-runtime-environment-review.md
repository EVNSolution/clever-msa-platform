# ev-dashboard Runtime Environment Review

이 문서는 `ev-dashboard` 운영 작업의 첫 번째 operator entry gate 이다. 어떤 실행 경로를 택하더라도, 먼저 현재 환경이 유지 가능한지와 바로 다음 문서가 무엇인지 확인한다.

## Purpose and scope

이 runbook 의 목적은 `destroy`, `cold rebuild`, `routine deploy`, `post-deploy validation` 중 어떤 작업을 시작하더라도, 먼저 공통 전제를 점검하게 만드는 것이다.

범위는 runtime 운영에 직접 영향을 주는 항목만 포함한다.

- retained Route53 hosted zone 확인
- retained ECR repository 및 immutable SHA image 확인
- VPC / subnet 유효성 확인
- CDK bootstrap 상태 확인
- GitHub OIDC infra role 확인
- required repo vars / secrets 확인
- desired count 정책 확인
- deploy environment 와 domain 조합 일치 확인
- company cockpit host / certificate / alias 준비 여부 확인

이 문서는 architecture note가 아니다. 체크 실패 시 무엇을 바꿔야 하는지 길게 설명하지 않고, 다음 실행 문서로 가기 전에 무엇이 맞아야 하는지만 고정한다.

참조 기준:

- [2026-04-15-ev-dashboard-full-runtime-shutdown-design.md](../superpowers/specs/2026-04-15-ev-dashboard-full-runtime-shutdown-design.md)

## When to use this runbook

다음 경우에는 항상 이 문서부터 본다.

- runtime 을 내리기 전에 retained asset 과 destroyable asset 을 구분할 때
- full destroy 이후 cold rebuild 를 시작하기 전에 전제가 맞는지 확인할 때
- routine deploy 전에 현재 환경과 배포 대상 domain 이 맞는지 확인할 때
- post-deploy validation 전에 operator 가 어느 문서로 가야 하는지 확인할 때

이 문서를 건너뛰고 다음 단계로 바로 가지 않는다. 하나라도 불일치하면 해당 작업을 중단하고 정합성을 맞춘 뒤 다시 시작한다.

## Retained asset check

아래 항목이 남아 있어야 한다.

- Route53 hosted zone 이 존재한다.
- ECR repository 가 존재한다.
- 배포에 필요한 immutable SHA image 가 존재한다.
- 현재 runtime 기준 문서가 유지된다.

검토 기준은 `ev-dashboard` canonical runtime 이다. hosted zone 은 남기되, runtime compute 와 datastore 를 모두 유지해야 한다는 뜻은 아니다. 이 문서는 retained asset 존재 여부만 확인한다.

만약 hosted zone 또는 ECR repository 가 사라졌다면, destroy 또는 rebuild 문서로 가지 말고 먼저 실제 계정 상태를 복구해야 한다.

## Infra prerequisite check

아래 infra 전제가 맞아야 한다.

- VPC ID 가 유효하다.
- public subnet ID 가 유효하다.
- private subnet ID 가 사용 중이라면 그 값도 유효하다.
- CDK bootstrap 이 완료되어 있다.
- GitHub OIDC infra role 이 존재하고 사용할 수 있다.

특히 VPC/subnet 은 문서상 값이 있는지만 보지 않는다. deploy 대상 환경에서 실제로 참조 가능한 ID 여야 한다. VPC 또는 subnet 이 바뀌었다면 이 runbook 단계에서 멈추고 infra 전제를 다시 맞춘다.

## GitHub configuration check

아래 GitHub 설정이 준비되어 있어야 한다.

- required repo vars / environment vars 가 존재한다.
- required secrets 가 존재한다.
- immutable SHA image URI 가 각 서비스에 대해 지정되어 있다.
- deploy environment 와 domain 조합이 일치한다.
- desired count 정책이 현재 작업 유형과 맞는다.
- company cockpit rollout 이면 `COCKPIT_HOSTS`와 tenant host 계획이 문서와 일치한다.

여기서 확인할 핵심은 두 가지다.

1. 환경 변수와 secret 이 빠지지 않았는가
2. `dev`, `stage`, `prod` 같은 deploy environment 와 실제 domain 이 서로 어긋나지 않는가

desired count 정책도 여기서 함께 본다. 예를 들어 destroy 또는 cold rebuild 중이라면 어떤 service 는 `0` 이 맞고, routine deploy 또는 post-deploy validation 중이라면 기대 desired count 가 달라진다.

## Company Cockpit Check

회사 전용 cockpit rollout 이 포함된 작업이면 아래를 추가로 본다.

1. hosted zone 이 cockpit host 를 수용한다.
2. `COCKPIT_HOSTS`가 대상 host 를 포함한다.
3. certificate SAN 과 Route53 alias 가 같은 host 를 기준으로 합성된다.
4. tenant metadata 와 `workspace-bootstrap` 계약이 이미 준비되어 있다.

자세한 실행 순서는 아래 runbook 을 따른다.

- [company-cockpit-onboarding.md](company-cockpit-onboarding.md)

## Runtime policy check

현재 작업이 무엇인지 먼저 분류한다.

- `destroy`
- `cold rebuild`
- `routine deploy`
- `post-deploy validation`

그 다음 아래 정책을 확인한다.

- 데이터 복구가 필요한가
- snapshot 이 필요한가
- fresh secret 이 필요한가
- fresh certificate 가 필요한가
- 새 datastore 를 만들어야 하는가

이 문서에서는 정책 결론만 남긴다. 데이터가 없고 snapshot 이 필요 없다고 이미 결정된 경우에는 destroy / cold rebuild 경로를 그대로 따라간다. 반대로 운영 지속이 목적이면 runtime 을 내리는 방향으로 가지 않는다.

## Branching rule

검토 결과에 따라 다음 문서를 즉시 선택한다.

- `destroy`
  - [2026-04-15-ev-dashboard-full-runtime-shutdown-design.md](../superpowers/specs/2026-04-15-ev-dashboard-full-runtime-shutdown-design.md)
- `cold rebuild`
  - [ev-dashboard-cold-start-rebuild.md](ev-dashboard-cold-start-rebuild.md)
- `routine deploy`
  - [ev-dashboard-ecs-preflight-gate.md](ev-dashboard-ecs-preflight-gate.md)
- `post-deploy validation`
  - [ev-dashboard-ui-smoke-and-decommission.md](ev-dashboard-ui-smoke-and-decommission.md)

분기는 모호하게 두지 않는다. operator 는 한 번에 하나의 경로만 선택한다.

## Next document map

이 문서를 통과했을 때의 다음 경로는 아래다.

1. destroy 를 진행하려면 shutdown design 으로 이동한다.
2. cold rebuild 를 진행하려면 cold start rebuild runbook 으로 이동한다.
3. routine deploy 를 진행하려면 ECS preflight gate 로 이동한다.
4. post-deploy validation 을 진행하려면 UI smoke and decommission runbook 으로 이동한다.

관련 문서:

- [2026-04-15-ev-dashboard-full-runtime-shutdown-design.md](../superpowers/specs/2026-04-15-ev-dashboard-full-runtime-shutdown-design.md)
- [company-cockpit-onboarding.md](company-cockpit-onboarding.md)
- [ev-dashboard-cold-start-rebuild.md](ev-dashboard-cold-start-rebuild.md)
- [ev-dashboard-ecs-preflight-gate.md](ev-dashboard-ecs-preflight-gate.md)
- [ev-dashboard-ui-smoke-and-decommission.md](ev-dashboard-ui-smoke-and-decommission.md)
