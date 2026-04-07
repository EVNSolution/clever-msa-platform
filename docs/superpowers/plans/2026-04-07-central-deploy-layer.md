# Central Deploy Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배포 권한과 정책은 중앙에서 통제하고, `clever-msa-platform`의 변경/조회가 변경 대상만 묶어서 배포되도록 하며, 기존 구조(`docs`/`development/*`)를 유지한다.

**Architecture:** `docs/`를 배포 사실의 진실 원천으로 유지하고, `docs/superpowers/plans` 및 `docs/rollout`에 전략/순서 문서를 선결정한다. 배포 런타임은 `deploy/` 카탈로그+오케스트레이션으로 묶고, 서비스는 기존 런타임 경계(`development/*`)를 유지한다. 현재 계정 특성(ECS/EKS 미사용, EC2+ECR 혼재, OIDC 미설정)에 맞춰 배포 실행기를 분리한다. EC2는 기존 호스트 재활용이 아니라 새 표준 app-host를 태그 기반으로 찾는 방향을 기본값으로 삼는다.

**Tech Stack:** GitHub Actions, GitHub OIDC, AWS CLI, ECR, ECS(향후), SSM/SSH(현재 EC2), jq

---

### Task 1: 배포 기준 고정 및 문서 골격 생성

**Files:**
- Create: `docs/rollout/2026-04-07-central-deploy-reference.md`
- Modify: `docs/rollout/README.md`
- Modify: `docs/superpowers/plans/2026-04-07-central-deploy-layer.md` (초안 동기화)

- [x] **Step 1: Define target 기준을 문서화**

정리할 항목:
- 중앙 배포 트리거: `main push`, `workflow_dispatch`, `repository_dispatch`
- 배포 단위: `service-*`, `front-*`, `edge-api-gateway`
- 배포 경로 우선순위(`wave`): core -> security/auth -> read-model -> front
- 승인 게이트: `dev` 자동, `stage` 선택, `prod` 수동 승인

- [x] **Step 1의 실행**

Run:
- `cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform && rg -n "staging|prod|deploy|wave|central" docs/rollout/README.md`
- 문서에 기존 정책과 충돌하는 항목이 있으면 정리

- [ ] **Step 2: Strategy/Runbook v0.1 확정**

Run:
- `cd docs && python3 -m json.tool /dev/null` (문서가 JSON 참조를 포함할 경우 형식 점검용으로 사용)
- `git diff --check`

### Task 2: 배포 카탈로그 스키마 정리

**Files:**
- Create: `docs/mappings/central-deploy-catalog.yaml`

- [x] **Step 1: 카탈로그 스키마 작성**

각 항목은 아래 필드를 가진다.
- `service_id`
- `repo`
- `runtime`: `ec2` | `ecr` | `ecs` | `lambda`
- `artifact`: container image repo 또는 zip/artifact 경로
- `wave`
- `depends_on`
- `health_check`
- `deploy_command`
- `rollback_command`

- [x] **Step 2: 서비스별 기초 입력**

아래 서비스를 우선 등록한다.
- `service-vehicle-registry`
- `service-vehicle-assignment`
- `service-settlement-registry`
- `service-settlement-payroll`
- `service-settlement-operations-view`
- `service-region-registry`
- `service-terminal-registry`
- `service-analytics-viewer`(현재 ECR `clever-analytics-viewer` 참조)

- [ ] **Step 2 실행**

Run:
- `cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform && rg -n \"development/service-|service-\" docs/mappings/current-runtime-inventory.md`

### Task 3: 변경 감지 로직 설계

**Files:**
- Create: `scripts/deploy/compute-targets.py`
- Modify: `docs/superpowers/plans/2026-04-07-central-deploy-layer.md` (변경 감지 규칙 기록)

- [x] **Step 1: 기준 규칙 구현**

구현 규칙:
- `development/` 하위 변경은 폴더 기반으로 service 추출
- `front-*`, `edge-api-gateway`, `service-*` 중 어느 쪽이든 변경 감지
- `docs/*` 변경 시 기본적으로 배포 유효성 검사만 수행하고 `dev/stage/prod` 배포 스킵
- `wave`와 `runtime`은 카탈로그로 확장

- [x] **Step 2: 파이썬 로직(초안) 작성**

입력:
- `base_sha`, `head_sha`
- 변경 파일 목록

출력:
- `targets.json` (`wave`, `services`, `runtime`, `depends_on`, `deploy_order`)

### Task 4: 중앙 GitHub Actions 워크플로 구축

**Files:**
- Create: `.github/workflows/central-deploy.yml`
- Create: `.github/workflows/central-deploy-dispatch.yml`
- Modify: `.github/workflows/central-deploy.yml` (운영 승인/보호 규칙 반영)

- [x] **Step 1: 중앙 배포 워크플로 골격**

구성:
- `workflow_dispatch`, `workflow_call`, `repository_dispatch`
- `matrix` 기반 wave 단위 순차 실행
- `aws-actions/configure-aws-credentials`로 OIDC 연결
- 각 job은 `deploy-runtime=<ec2|ecr|ecs>` 분기

- [x] **Step 2: EC2 배포 경로 적용**

최초 실행은 EC2용 경로:
- SSM online 인스턴스에 대한 배포 타겟 배정
- `deploy_command` 실행
- 실패 시 실패 wave만 롤백

- [ ] **Step 3: ECR 전용 경로 적용**

- `sha` 기반 immutable 태그 사용
- 가능하면 `digest` 기준으로 배포
- `latest`는 선택(운영 기본 배포 제외)

- [ ] **Step 3 실행**

Run:
- `python3 scripts/deploy/compute-targets.py`
- `bash -n .github/workflows/central-deploy.yml`

### Task 5: IAM OIDC와 런타임 권한 연결

**Files:**
- Create: `docs/rollout/2026-04-07-aws-oidc-actions-setup.md`
- Modify: `docs/rollout/README.md`

- [x] **Step 1: OIDC Provider 기준 문서화**

실행 순서:
- GitHub OIDC Identity Provider 생성
- `token.actions.githubusercontent.com` Thumbprint 확인
- 환경별 Trust 정책(`main`, `refs/tags/*`, `refs/heads/main`) 적용

- [x] **Step 2: IAM Role 분리**

Create roles:
- `gh-actions-dev-deploy`
- `gh-actions-stage-deploy`
- `gh-actions-prod-deploy`

각 역할 최소 권한:
- 중앙 카탈로그에 정의된 서비스만 대상
- 배포·로그·태그 읽기 정도만 허용

- [ ] **Step 3: 문서 일치 점검**

Run:
- `/opt/homebrew/bin/aws iam list-open-id-connect-providers`
- `/opt/homebrew/bin/aws iam list-roles --query "Roles[?contains(RoleName,'gh-actions')].RoleName"`

### Task 6: 운영 전환 테스트

**Files:**
- Create: `docs/rollout/2026-04-07-central-deploy-cutover-checklist.md`
- Modify: `docs/rollout/README.md`

- [ ] **Step 1: 스테이징 dry-run**

`dev` 배포 워크플로를 `--targets dev-analytics` 단일 서비스로 실행

- [ ] **Step 2: 실패/롤백 시나리오 점검**

케이스:
- 변경 대상 1개 배포 실패
- 의존성 없는 2개 동시 wave 실패
- 운영 승인 거부

- [ ] **Step 3: 운영 승인 및 본 운영 1차 가동**

조건:
- `dev` 안정 3회 연속 통과
- `stage` 1회 통과
- `prod`는 긴급 롤백 프로세스 테스트 포함 승인

- [ ] **Step 4: Commit**

Run:
- `git add docs/rollout/2026-04-07-aws-oidc-actions-setup.md docs/mappings/central-deploy-catalog.yaml scripts/deploy/compute-targets.py .github/workflows/central-deploy.yml .github/workflows/central-deploy-dispatch.yml docs/rollout/2026-04-07-central-deploy-reference.md docs/rollout/2026-04-07-central-deploy-cutover-checklist.md`
- `git commit -m "chore: draft central deploy layer strategy and orchestrator scaffold"`
