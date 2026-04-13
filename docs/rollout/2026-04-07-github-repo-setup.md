# GitHub 저장소 설정 기준

중앙 배포 레이어가 동작하려면 코드만 있는 것으로는 부족하다. GitHub repository 쪽 설정도 같이 완료되어야 한다.

> 이 문서는 **현재 운영 중인 GitHub Actions + OIDC 기반 중앙 배포 경로**의 저장소 설정 기준이다.
> ECS/CDK + GitHub Actions OIDC 경로는 [2026-04-13-ecs-cdk-oidc-actions-transition.md](2026-04-13-ecs-cdk-oidc-actions-transition.md)를 기준으로 본다.

## 1) 원격 저장소 연결

현재 로컬 작업트리에서 `git remote -v` 기준 원격이 비어 있으면, 먼저 GitHub repository를 만들고 `origin` 을 연결해야 한다.

권장 canonical repo:

- `EVNSolution/clever-msa-platform`

`gh` CLI가 로그인돼 있으면 다음처럼 비대화형으로 생성할 수 있다.

```bash
gh repo create EVNSolution/clever-msa-platform \
  --private \
  --description "CLEVER MSA platform monorepo" \
  --disable-issues \
  --disable-wiki \
  --source=. \
  --remote=origin

git push -u origin main
```

수동으로 할 경우 예:

```bash
git remote add origin git@github.com:EVNSolution/clever-msa-platform.git
git push -u origin main
```

## 2) GitHub Environments

아래 environment를 만든다.

- `dev`
- `stage`
- `prod`

권장 정책:

- `dev`: 승인 없음
- `stage`: 승인 1명
- `prod`: 승인 1명 이상 + 운영자 제한

`central-deploy.yml`은 job-level `environment`를 사용하므로, environment protection rule이 있으면 그대로 승인 게이트로 동작한다.

## 3) Repository Secrets

필수 secrets:

- `GH_ACTIONS_DEV_DEPLOY_ROLE_ARN`
- `GH_ACTIONS_STAGE_DEPLOY_ROLE_ARN`
- `GH_ACTIONS_PROD_DEPLOY_ROLE_ARN`
- `GH_ACTIONS_INFRA_ROLE_ARN`

권장 규칙:

- deploy role은 환경별로 분리
- infra role은 EC2 생성 전용
- 가능하면 Organization secret보다 repo secret으로 먼저 고정

## 4) Actions 설정

GitHub Actions permissions:

- Workflow permissions: `Read and write`가 꼭 필요한 것은 아니고, 현재 워크플로는 `id-token: write`, `contents: read`만 사용한다.
- Actions가 organization policy로 막혀 있으면 `actions/checkout`, `aws-actions/configure-aws-credentials`, `actions/upload-artifact`를 허용해야 한다.

## 5) 첫 실행 순서

권장 첫 실행:

1. `EVNSolution/clever-msa-platform` 생성 및 `main` push
2. GitHub environments `dev/stage/prod` 생성
3. `provision-ec2-app-host.yml`로 새 `dev` host 생성
4. AWS Console 또는 CLI에서 SSM online 확인
5. `central-deploy-dispatch.yml`로 `service-delivery-record` dry-run
6. dry-run 통과 후 `dry_run=false`로 재실행

## 6) branch 기준

현재 워크플로 기본 가정:

- 자동 배포 트리거: `main` push
- 수동 배포: `workflow_dispatch`

따라서 운영 전에 `main` 보호 규칙은 별도로 정해야 한다.

권장값:

- direct push 제한
- PR merge 기준 적용
- required checks는 추후 `central-deploy` 또는 smoke workflow 안정화 후 추가
