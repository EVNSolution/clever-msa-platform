# Central Deploy Control Repo Split Design

## Goal

`clever-msa-platform`를 중앙 배포 레포로 쓰지 않고, 새 `EVNSolution/clever-deploy-control` 레포를 만들어 배포 실행 책임을 완전히 분리한다.

목표는 세 가지다.

1. `clever-msa-platform`는 아키텍처와 경계의 정본으로 남긴다.
2. 새 `clever-deploy-control`는 GitHub Actions, AWS OIDC, EC2 bootstrap, 배포 catalog를 소유하는 중앙 control-plane repo가 된다.
3. `development/*`와 각 `service-*` 구현 repo는 어느 중앙 레포에도 runtime code bundle로 다시 묶지 않는다.

## Problem Statement

현재 `clever-msa-platform`는 문서 정본과 `development/*` 구현 repo 묶음을 함께 담고 있다. 이 루트 전체를 GitHub 중앙 배포 레포처럼 사용하면, 설계상 `멀티레포 + 중앙 배포 레이어` 전략과 실제 운영 단위가 어긋난다.

문제는 다음과 같다.

1. `development/*`가 함께 노출되면 중앙 control repo가 아니라 사실상 모노레포처럼 보인다.
2. 아키텍처 truth와 배포 execution truth가 같은 repo에 섞인다.
3. GitHub Actions, OIDC trust, AWS infra role이 platform SSOT repo에 묶여 장기 유지보수성이 떨어진다.

## Decision

새 중앙 배포 레포를 만든다.

- 새 repo 이름: `EVNSolution/clever-deploy-control`
- 권장 역할: deployment truth, runtime deploy inventory, runbook, workflow, AWS integration
- 기존 `clever-msa-platform` 역할: architecture truth, repo map, boundary, contract, decision, migration documentation

이 설계는 `배포 + 운영 인벤토리`를 새 control repo에 두고, 아키텍처 정본은 기존 platform repo에 남기는 방식을 택한다.

## Rejected Approaches

### 1. `clever-msa-platform`를 그대로 control repo로 유지

기각 이유:

1. `development/*`와 배포 control-plane이 같은 repo에 묶여 전략 메시지가 흐려진다.
2. platform SSOT와 deployment truth가 섞인다.
3. 장기적으로 서비스 repo가 늘수록 중앙 repo가 비대해진다.

### 2. 새 control repo에 docs 대부분까지 이관

기각 이유:

1. `clever-msa-platform`의 존재 이유가 약해진다.
2. architecture truth가 다시 operational repo로 빨려 들어간다.
3. 중복 문서와 drift 위험이 커진다.

## Ownership Split

### `clever-msa-platform`에 남길 것

- `WORKSPACE.md`
- `repo-map.md`
- `docs/goals/`
- `docs/boundaries/`
- `docs/contracts/`
- `docs/decisions/`
- `docs/mappings/` 안의 구조/경계/이동표 성격 문서
- `docs/archive/`
- 서비스 경계, ownership, migration rationale를 설명하는 문서 전체

### `EVNSolution/clever-deploy-control`로 이동할 것

- `.github/workflows/central-deploy.yml`
- `.github/workflows/central-deploy-dispatch.yml`
- `.github/workflows/provision-ec2-app-host.yml`
- `scripts/deploy/compute-targets.py`
- `scripts/deploy/runner.sh`
- `scripts/deploy/exec-runtime.sh`
- `scripts/deploy/rollback.sh`
- `scripts/deploy/bootstrap-ec2-amazon-linux-2023.sh`
- GitHub Actions / AWS OIDC / EC2 app-host / cutover runbook
- 배포 대상 catalog
- 사람이 읽는 deploy inventory

### 어느 쪽에도 넣지 말 것

- `development/*` 전체
- 각 서비스 runtime code
- 서비스별 `node_modules`, build artifact, local DB, generated output
- 중앙 배포를 이유로 서비스 코드를 다시 한 repo에 모으는 자산

## Source of Truth Rules

두 레포는 서로 다른 truth를 가진다.

### `clever-msa-platform`

다음 질문의 정본이다.

1. 어떤 repo가 어떤 도메인을 소유하는가
2. 어떤 서비스 경계를 유지해야 하는가
3. 어떤 read model이 source of truth가 아닌가
4. 왜 현재 구조를 선택했는가

### `clever-deploy-control`

다음 질문의 정본이다.

1. 어떤 service가 어느 environment에 배포되는가
2. 배포 wave, health check, remote command는 무엇인가
3. 어떤 AWS role과 GitHub environment를 쓰는가
4. 새 EC2 host를 어떻게 부트스트랩하는가

## Duplication Policy

다음 정보는 중복 금지다.

1. 서비스 경계 정의
2. 계약 문서
3. migration rationale
4. source-of-truth ownership 설명

다음 정보는 `clever-deploy-control`만 소유한다.

1. deploy catalog
2. runtime deploy inventory
3. workflow definition
4. OIDC / EC2 / cutover runbook

필요하면 `clever-deploy-control` 문서에서 `clever-msa-platform` 문서를 링크한다. 같은 설명을 복붙하지 않는다.

## Recommended `clever-deploy-control` Layout

```text
clever-deploy-control/
├── .github/
│   └── workflows/
│       ├── central-deploy.yml
│       ├── central-deploy-dispatch.yml
│       └── provision-ec2-app-host.yml
├── catalog/
│   ├── services.yaml
│   ├── environments.yaml
│   └── ownership-map.yaml
├── scripts/
│   └── deploy/
│       ├── compute-targets.py
│       ├── runner.sh
│       ├── exec-runtime.sh
│       ├── rollback.sh
│       └── bootstrap-ec2-amazon-linux-2023.sh
├── docs/
│   ├── runbooks/
│   │   ├── aws-oidc-setup.md
│   │   ├── ec2-app-host-bootstrap.md
│   │   ├── central-deploy-cutover.md
│   │   └── github-repo-setup.md
│   └── inventory/
│       └── current-runtime-deploy-inventory.md
└── README.md
```

## Deploy Inventory Minimum Schema

`clever-deploy-control`의 catalog와 deploy inventory는 최소한 아래 필드를 공통으로 가져야 한다.

- `service`
- `repo`
- `environment`
- `runtime`
- `strategy`
- `artifact`
- `compose_service`
- `health_check`
- `rollback_command`
- `owner`

원칙:

1. 마이그레이션 1차 단계에서는 `single catalog`를 유지한다.
2. 즉, 기존 `docs/mappings/central-deploy-catalog.yaml`를 새 repo의 `catalog/services.yaml`로 1:1 이관한다.
3. workflow와 script는 이 single catalog를 기계가 읽는 정본으로 사용한다.
4. 사람이 읽는 inventory 문서는 catalog를 설명하는 요약본으로만 둔다.
5. 동일 정보를 서로 다른 자유 형식 문서에 중복 저장하지 않는다.
6. 새 서비스 추가는 catalog 업데이트 없이는 배포 대상에 편입되지 않는다.

추가 규칙:

1. `catalog/environments.yaml`, `catalog/ownership-map.yaml` 같은 분리는 2차 정리 작업으로 미룬다.
2. `compute-targets.py`가 읽는 구조를 먼저 유지해서 migration 중 스크립트 변경 범위를 최소화한다.
3. layout을 바꾸더라도 `services catalog compatibility`를 먼저 정의한 뒤 바꾼다.

## Asset Discovery Rules

마이그레이션 전에 `clever-msa-platform`에서 아래 기준으로 이동 대상 자산을 전수 식별해야 한다.

탐색 범주:

1. `.github/workflows/` 아래 배포 관련 workflow
2. `scripts/` 아래 배포/부트스트랩/롤백/타깃 계산 스크립트
3. 배포 문서에서 직접 참조하는 catalog, inventory, runbook
4. workflow에서 참조하는 secret 이름, role ARN 이름, environment 이름
5. script와 workflow 내부 경로 참조
6. `repository_dispatch`, 수동 승인 경로, 외부 release trigger 같은 호출자 경로

누락 방지 원칙:

1. 파일명 목록만으로 이동 대상을 확정하지 않는다.
2. `workflow -> script -> catalog -> runbook` 참조 체인을 기준으로 이동 범위를 닫는다.
3. old repo에 남는 배포 진입점이 없도록 `trigger file`, `called script`, `referenced secret`, `referenced path`를 함께 점검한다.
4. cutover 직전에는 old repo에서 배포 관련 파일이 더 이상 실행 경로를 만들지 않는지 재확인한다.
5. 외부에서 old repo workflow를 호출하는 trigger source가 남아 있지 않은지 함께 확인한다.

## Migration Sequence

1. `clever-msa-platform`에서 이동 대상 control-plane 자산을 고정한다.
2. 새 GitHub repo `EVNSolution/clever-deploy-control`를 만든다.
3. workflow, deploy script, runbook, deploy inventory를 새 repo 구조에 맞게 재배치한다.
4. 현재 workflow/script의 경로 참조를 새 repo 기준으로 수정한다.
5. GitHub environments와 secrets를 새 repo 기준으로 다시 연결한다.
6. AWS OIDC trust policy의 subject를 old repo에서 new repo로 전환한다.
7. `clever-msa-platform`에서 배포 전용 파일을 제거한다.
8. 새 repo에서 `dev` provisioning -> deploy dry-run -> 실제 배포 순서로 검증한다.

## Cutover Rules

cutover 중에는 old repo와 new repo가 동시에 deploy 권한을 오래 갖지 않게 한다.

원칙:

1. 새 repo에서 workflow와 secret이 준비되기 전에는 old repo 권한을 완전히 제거하지 않는다.
2. 새 repo의 첫 dry-run 성공 후 old repo의 deploy workflow와 role trust를 제거한다.
3. OIDC trust policy는 최종적으로 `EVNSolution/clever-deploy-control`만 허용한다.
4. old repo는 배포 트리거를 소유하지 않는다.

## Cutover Validation And Rollback

새 control repo 전환은 한 번에 끝내지 않고 아래 게이트를 통과해야 한다.

### Validation Gates

1. 새 repo의 GitHub environments와 secrets가 준비돼 있어야 한다.
2. 새 repo의 `provision-ec2-app-host`가 `dev`에서 성공해야 한다.
3. 새 repo의 `central-deploy-dispatch`가 `dev` 단일 서비스 dry-run에 성공해야 한다.
4. 새 repo의 `central-deploy-dispatch`가 `dev` 단일 서비스 실제 배포에 성공해야 한다.
5. health check가 통과한 뒤에만 old repo의 deploy trust 제거 단계로 넘어간다.

### Rollback Rules

새 repo cutover 실패 시 아래 순서로 복귀한다.

1. 새 repo에서 더 이상의 deploy workflow 실행을 중지한다.
2. AWS OIDC trust에서 new repo subject를 제거하거나 비활성화한다.
3. old repo의 deploy trust와 secret을 임시 복구한다.
4. 마지막 성공 상태 기준으로 old repo 경로에서 재배포한다.
5. 실패 원인과 누락 자산을 기록한 뒤 다시 cutover 창을 잡는다.

### Rollback Trigger

아래 조건이면 cutover를 실패로 본다.

1. 새 repo에서 `dev` 실제 배포가 실패한다.
2. 배포는 끝났지만 서비스 health check가 실패한다.
3. 예상한 service target 외에 배포 대상 계산이 흔들린다.
4. old/new repo 중 둘 다 deploy 권한을 가진 상태가 장시간 남는다.

## Key Risks And Mitigations

### 1. OIDC trust policy drift

위험:

- old repo와 new repo가 동시에 AWS assume 권한을 가지면 control-plane이 이중화된다.

완화:

- cutover 체크리스트에 `old repo trust 제거`를 명시한다.
- deploy role trust subject를 repo/environment 단위로 좁게 유지한다.

### 2. Inventory duplication

위험:

- platform repo와 control repo에 같은 runtime inventory가 있으면 빠르게 drift 난다.

완화:

- platform repo는 architecture inventory만 유지한다.
- control repo는 deploy inventory만 유지한다.
- 동일 파일명/동일 설명 복제를 피하고 링크로 연결한다.

### 3. Private repo bootstrap credentials

위험:

- 새 EC2 host가 private repo를 읽지 못하면 source-based deploy가 멈춘다.

완화:

- read-only deploy key + SSM Parameter Store SecureString 조합을 기본 전략으로 택한다.
- host는 최소 읽기 권한만 가진다.

## Non-Goals

이번 설계는 아래를 바로 수행하지 않는다.

1. 각 서비스 repo의 배포 방식을 image-based로 전면 전환
2. 서비스 코드 구조 재설계
3. `clever-msa-platform`의 docs SSOT 역할 제거
4. 모든 운영 문서를 새 control repo로 통째로 복사

## Acceptance Criteria

아래가 만족되면 설계가 성공한 것이다.

1. `EVNSolution/clever-deploy-control`가 새 중앙 배포 repo로 생성된다.
2. 배포 workflow와 deploy script는 새 repo에서만 실행된다.
3. `clever-msa-platform`는 architecture SSOT로만 남는다.
4. `development/*`는 중앙 repo 어디에도 runtime bundle로 포함되지 않는다.
5. AWS OIDC trust와 GitHub secrets는 새 repo 기준으로 정리된다.
6. 새 repo에서 `dev` app-host provisioning과 deploy dry-run이 가능하다.

## Recommendation

최종 권장안은 다음 한 줄로 요약된다.

`clever-msa-platform`는 설계 정본으로 남기고, `EVNSolution/clever-deploy-control`를 새 중앙 배포 control-plane repo로 분리한다.
