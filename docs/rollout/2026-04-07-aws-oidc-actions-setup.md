# AWS OIDC + GitHub Actions 배포 권한 설정 (중앙 배포 레이어용)

현재 환경 점검 기준으로, OIDC 공급자와 배포용 Role은 아직 미구성 상태였다.

## 1) OIDC Provider 생성

`token.actions.githubusercontent.com`에 대한 OIDC provider를 먼저 등록한다.

```bash
/opt/homebrew/bin/aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1a
```

## 2) 중앙 배포용 역할(Role) 3종 생성

권장 역할:

- `gh-actions-dev-deploy`
- `gh-actions-stage-deploy`
- `gh-actions-prod-deploy`

GitHub repository secrets로 아래 ARN을 주입한다.

- `GH_ACTIONS_DEV_DEPLOY_ROLE_ARN`
- `GH_ACTIONS_STAGE_DEPLOY_ROLE_ARN`
- `GH_ACTIONS_PROD_DEPLOY_ROLE_ARN`
- `GH_ACTIONS_INFRA_ROLE_ARN`

Trust 정책 샘플:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringEquals": {
          "token.actions.githubusercontent.com:sub": "repo:<ORG>/<REPO>:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Stage/Prod는 필요 시 `:ref:refs/heads/main`, 태그 기반 배포는 필요 시 `:ref:refs/tags/v*`를 추가한다.

## 3) 최소 권한 정책 기준

운영 초안으로는 아래 권한만 부여하고, 배포 대상이 늘어날 때 카탈로그 기반으로 확장한다.

권장 점검 기준:

- `GH_ACTIONS_DEV_DEPLOY_ROLE_ARN` / `GH_ACTIONS_STAGE_DEPLOY_ROLE_ARN` / `GH_ACTIONS_PROD_DEPLOY_ROLE_ARN` 모두 저장
- 새 EC2 생성 워크플로를 쓸 경우 `GH_ACTIONS_INFRA_ROLE_ARN` 추가
- 배포 실행 시점에 role이 존재하지 않으면 배포 job이 실패(의도적 안전 규칙)하도록 유지

- ECR: `GetAuthorizationToken`, `BatchGetImage`, `GetDownloadUrlForLayer`, `GetRepositoryPolicy` (필요 최소)
- ECS: `Describe*`, `UpdateService`, `DescribeTaskDefinition`, `RegisterTaskDefinition`, `UpdateService`, `Deploy` 계열 (ecs 런타임 사용 시)
- EC2/SSM: `DescribeInstances`, `GetParameter`, `SendCommand`
- Infra role 추가 시: `RunInstances`, `CreateTags`, `DescribeImages`, `DescribeSubnets`, `DescribeSecurityGroups`, `DescribeIamInstanceProfileAssociations`
- CloudWatch Logs: 배포 로그 조회/필터
- S3/CloudWatch Log Group write for audit trail (운영 요구 시)

## 4) 리소스와 카탈로그 연결

중앙 카탈로그(`docs/mappings/central-deploy-catalog.yaml`)는 `runtime`, `artifact`, `deploy_command`를 정의한다.  
GitHub Actions는 catalog 항목을 읽고 `runtime`별로 아래와 같이 역할을 라우팅한다.

- `runtime: ec2` -> `gh-actions-*`가 `ssm:SendCommand` 중심 명령 수행
- `runtime: ecr` -> `gh-actions-*`가 빌드/푸시/이미지 조회 수행
- `runtime: ecs` -> 추후 활성화

## 5) 적용 후 검증 체크

- OIDC provider 존재 확인:
```bash
/opt/homebrew/bin/aws iam list-open-id-connect-providers
```

- 역할 연결 확인:
```bash
/opt/homebrew/bin/aws iam list-roles \
  --query "Roles[?contains(RoleName, 'gh-actions')].[RoleName, Arn]"
```

- GitHub에서 OIDC 연결 테스트:
  - staging에서 1회 `workflow_dispatch` 실행
  - 로그에서 `AssumeRoleWithWebIdentity` 성공 여부 확인
