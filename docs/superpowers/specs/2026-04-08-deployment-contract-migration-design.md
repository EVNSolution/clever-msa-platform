# CLEVER Deployment Contract Migration

> Update note (2026-04-13): 이 문서는 phase-1에서 `source deploy -> image deploy` 전환을 고정한 상위 설계다.
> 현재 rollout truth에서 **새 ECS/CDK + GitHub Actions OIDC 경로**를 보려면 [../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md](../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md)를 먼저 본다.

## Purpose

이 문서는 현재 `host-side git + host-side build` 배포 계약을 `image-based deploy` 계약으로 전환하기 위한 1차 설계를 고정한다.

이번 문서의 목표는 아래다.

1. 현재 배포 계약과 목표 배포 계약의 차이를 명확히 정의한다.
2. 1차 전환 방향을 `GitHub Actions -> ECR push -> EC2 pull`로 고정한다.
3. 왜 지금 `AWS CodeBuild/CodeConnections`부터 가지 않는지 경계를 분명히 한다.

이 문서는 실행 계획이 아니라 상위 설계 문서다.

## Current Contract

현재 배포 계약은 아래와 같다.

```text
GitHub Actions
-> AWS OIDC
-> SSM command
-> EC2 app host
-> host가 GitHub repo clone/pull
-> host가 docker compose build/up
```

이 구조에서 배포 단위는 `source code`다.

즉, 중앙 배포 레이어는 host에게 “어떤 소스를 가져와서 build할지”를 전달한다.

## Target Contract

목표 배포 계약은 아래로 고정한다.

```text
Service repo push
-> GitHub Actions가 image build
-> ECR push
-> central deploy가 image tag를 결정
-> SSM command
-> EC2 app host
-> host는 ECR에서 image pull
-> docker compose up -d
```

이 구조에서 배포 단위는 `container image`다.

즉, 중앙 배포 레이어는 host에게 “어떤 image tag를 실행할지”를 전달한다.

## Primary Decision

1차 전환 방향은 아래로 고정한다.

- build owner: `GitHub Actions`
- artifact registry: `Amazon ECR`
- runtime deploy mode: `EC2 host pull + compose up`

즉, 이번 전환의 핵심은 `source deploy -> image deploy`다.

## Why This Direction

### 1. 지금 가장 큰 기술 부채를 바로 줄일 수 있다

현재 구조의 가장 큰 문제는 아래다.

- host-side git
- host-side build
- GitHub read-only token의 runtime 의존성
- sibling repo build context 문제
- host workspace drift

이 문제들은 `CodeBuild` 도입 여부와 별개로, 우선 `image deploy` 계약으로 바꾸면 대부분 줄어든다.

### 2. 현재 중앙 배포 레이어를 그대로 활용할 수 있다

이미 아래는 dev에서 검증이 끝났다.

- GitHub Actions
- AWS OIDC
- SSM dispatch
- EC2 app host orchestration

즉, 지금 당장 바꿔야 하는 것은 orchestration layer가 아니라 **배포 단위와 host 역할**이다.

### 3. 전환 리스크를 분리할 수 있다

이번 단계에서 바꿀 것은 아래다.

- build location: host -> CI runner
- deploy unit: source -> image

이번 단계에서 바꾸지 않는 것은 아래다.

- central deploy repository 구조
- OIDC 기반 인증 구조
- SSM remote execution 구조

즉, 현재 잘 돌아가는 제어면은 유지하고 계약만 바꾼다.

## Why Not CodeBuild / CodeConnections First

이번 단계에서 `AWS CodeBuild/CodeConnections`를 primary로 채택하지 않는 이유는 아래다.

### 1. 문제의 본질이 그쪽이 아니다

현재 가장 큰 문제는 “누가 GitHub source를 읽느냐”보다 “host가 직접 source를 읽고 build한다”는 점이다.

즉, 먼저 풀어야 할 것은 build owner를 host에서 떼는 것이다.

### 2. 동시에 바꾸면 실패 원인 분리가 어렵다

아래를 동시에 바꾸면 전환 복잡도가 급격히 올라간다.

- source deploy -> image deploy
- GitHub Actions build -> CodeBuild build

이번 단계는 첫 번째만 닫는 것이 맞다.

### 3. 후속 단계로는 여전히 열어둘 수 있다

장기적으로는 아래 경로를 다시 검토할 수 있다.

```text
GitHub source
-> CodeConnections
-> CodeBuild
-> ECR
-> EC2 pull
```

하지만 그건 2차 고도화다.

## Contract Comparison

### Current

- deploy unit: source
- build owner: EC2 host
- host responsibility: git + build + run
- required host credential: GitHub read token + ECR optional
- rollback unit: source revision / host workspace state

### Target

- deploy unit: image
- build owner: GitHub Actions
- host responsibility: pull + run
- required host credential: ECR pull only
- rollback unit: image tag

## Architecture Boundary After Migration

전환 후 각 계층의 책임은 아래로 정리된다.

### Service Repository

- source of truth for application code
- image build definition
- image tagging convention

### GitHub Actions

- build image
- test/build gate
- push image to ECR

### Central Deploy Control

- decide target service/environment/image tag
- orchestrate rollout wave
- dispatch SSM command

### EC2 App Host

- authenticate to ECR
- pull image
- run compose service

즉 host는 더 이상 GitHub source를 읽지 않는다.

## Compose Strategy

전환 후 배포용 compose는 `build:` 중심이 아니라 `image:` 중심으로 정리해야 한다.

예시 방향:

현재:

```yaml
admin-front:
  build:
    context: ../front-admin-console
```

목표:

```yaml
admin-front:
  image: ${FRONT_WEB_CONSOLE_IMAGE}
```

즉, 로컬 개발용 compose와 배포용 compose의 역할을 명확히 나눌 필요가 있다.

## Required Migration Steps

상세 execution plan에서 최소 아래를 다뤄야 한다.

1. 서비스별 ECR repository naming 규칙
2. image tag 규칙
- sha tag
- optional env tag

3. 서비스 repo별 build workflow
4. deploy-control catalog schema 변경
- source repo path 중심 -> image repository 중심

5. compose deploy file/image variable 정리
6. host-side git dependency 제거
7. rollback을 image tag 기준으로 재정의

## Explicit Non-Goals For This Phase

이번 전환 단계에서 하지 않는 것은 아래다.

- CodeBuild/CodeConnections primary 전환
- ECS/EKS 전환
- CloudFront/S3 front hosting 분리
- runtime platform 재구성

즉, 이번 단계는 `EC2 + SSM + compose`는 유지하고, source deploy만 image deploy로 바꾼다.

## Risks

### 1. Compose와 image naming drift

서비스별 image name/tag와 compose variable naming이 엇갈리면 운영이 불안정해진다.

### 2. 일부 서비스만 image deploy로 바뀌는 과도기

전환 중에는 source deploy와 image deploy가 공존할 수 있다.

이 기간 동안 catalog가 어떤 서비스를 어떤 계약으로 배포하는지 명확히 구분해야 한다.

### 3. front build/runtime packaging 미정

특히 프론트는 현재 dev server 성격이 남아 있다.

즉 backend보다 front image 전략을 더 조심해서 정해야 한다.

### 4. rollback 기준 변경

기존에는 source revision과 host 상태를 봤다면, 앞으로는 image tag와 deployment record를 기준으로 봐야 한다.

## Done Criteria

이 트랙의 완료 기준은 아래다.

1. 최소 1개 서비스가 image-based deploy로 전환됨
2. EC2 host가 GitHub read token 없이도 해당 서비스를 배포할 수 있음
3. deploy-control이 image tag 기준으로 rollout 가능
4. rollback이 image tag 기준으로 가능
5. source deploy가 아닌 image deploy가 canonical contract로 문서화됨

## Suggested Migration Order

권장 순서는 아래다.

1. backend 서비스 1개로 image deploy prototype
2. deploy-control catalog schema 확장
3. compose deploy file/image variable 구조 정리
4. front image strategy 별도 확정
5. 서비스별 전환 확대
6. host-side GitHub token 제거
7. 이후 필요 시 CodeBuild/CodeConnections 검토

## Follow-up Documents

이 문서 다음으로 필요한 상세 문서는 아래다.

1. image deploy prototype spec
- 어떤 서비스로 첫 전환을 시작할지

2. deploy-control catalog migration plan
- source target -> image target schema 전환

3. runtime compose split plan
- local-dev compose와 deploy compose 분리 여부

4. host-side git retirement plan
- GitHub read token 제거 절차
