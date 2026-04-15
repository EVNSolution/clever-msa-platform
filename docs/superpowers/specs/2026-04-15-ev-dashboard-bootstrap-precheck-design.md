# ev-dashboard Bootstrap Precheck Design

## Purpose

이 문서는 `ev-dashboard` EC2 app/data host 전환에서 반복되는 full deploy 낭비를 줄이기 위해, `bootstrap precheck` 단계를 canonical dev/candidate 흐름에 추가하는 설계를 고정한다.

목표는 아래다.

1. bootstrap 실패를 `CloudFormation rollback`이 아니라 인스턴스 직접 검증 단계에서 먼저 잡는다.
2. shell heredoc 중심 bootstrap을 Python package 기반 bootstrap으로 바꿔 quoting, SQL, device, systemd drift를 줄인다.
3. `run 전에 bootstrap correctness를 증명한다`는 운영 규칙을 lesson과 runbook에 고정한다.

## Problem

현재 EC2/EBS 전환의 가장 큰 낭비는 `topology`보다 `bootstrap`에서 나온다.

- app host
  - Docker install
  - image map fetch
  - env render
  - gateway proof config mount
  - container startup
- data host
  - EBS mount
  - PostgreSQL/Redis runtime
  - role/database bootstrap

이 로직이 `user-data` shell 안에 깊게 들어가 있으니, 작은 quoting/escape/device/systemd 오류도 매번:

```text
workflow
-> cdk deploy
-> EC2 launch
-> cloud-init
-> bootstrap fail
-> CloudFormation rollback
```

형태로 드러난다.

이건 느리고, dev lane을 disposable로 계속 지워야 하며, lesson이 코드로 고정되기 전에 시간을 태운다.

## Options

### 1. Keep shell user-data and only add more tests

장점:
- 가장 적은 변경

단점:
- host-level failure는 여전히 full deploy에서 먼저 드러남
- shell quoting/escape drift가 계속 남음

### 2. Python bootstrap package + SSM precheck

구조:
- bootstrap 로직을 Python package로 분리
- user-data는 얇은 launcher만 유지
- SSM으로 bootstrap package를 host에 sync하고 `verify` 모드로 직접 실행
- verify가 통과한 뒤에만 full `cdk deploy`

장점:
- 지금 겪는 시간 낭비를 가장 직접적으로 줄임
- bootstrap correctness와 infra rollout을 분리 가능
- lesson을 코드와 검증 절차로 고정하기 쉬움

단점:
- bootstrap package와 precheck runner를 새로 만들어야 함

### 3. AMI bake / image-based host runtime

장점:
- 가장 재현성 높음

단점:
- 지금 단계에선 scope가 너무 큼
- AMI lifecycle까지 같이 설계해야 함

## Decision

이번 전환에서는 **2번, Python bootstrap package + SSM precheck**를 채택한다.

즉 앞으로의 dev/candidate proof 순서는 아래다.

```text
bootstrap package change
-> SSM bootstrap precheck on live dev hosts
-> success
-> full cdk deploy / runtime proof
```

full deploy는 없어지지 않는다. 다만 **bootstrap correctness를 이미 증명한 뒤에만** 돌린다.

## Scope

이번 설계의 범위:

1. `development/infra-ev-dashboard-platform` 내부 bootstrap 로직 재구성
2. app host / data host bootstrap Python package 도입
3. SSM-driven `bootstrap precheck` path 추가
4. workflow/runbook/lesson에 precheck gate 반영

이번 설계의 비범위:

1. AMI bake
2. ECS/EC2 전환 자체의 재설계
3. prod cutover acceptance의 완화

## Architecture

### 1. Thin user-data

user-data는 아래만 담당한다.

- Python/Docker/jq 설치
- bootstrap package directory 준비
- thin launcher script 배치
- systemd unit/timer wiring

즉 business bootstrap 로직은 user-data에 직접 길게 넣지 않는다.

### 2. Python bootstrap package

`infra-ev-dashboard-platform` 안에 실제 host bootstrap package를 둔다.

예상 구조:

```text
bootstrap/
  ev_dashboard_runtime/
    __init__.py
    common.py
    app_host.py
    data_host.py
    cli.py
```

역할:

- `app_host.py`
  - ECR login
  - image map read
  - env file render
  - proof gateway config render
  - app containers reconcile
- `data_host.py`
  - block device 확인
  - filesystem/mount
  - PostgreSQL/Redis runtime
  - DB/user/database bootstrap
- `cli.py`
  - `reconcile`
  - `verify`
  - `install-systemd`

### 3. Precheck runner

precheck runner는 workflow 또는 local command에서 아래를 수행한다.

1. 대상 lane host(app/data)를 찾는다.
2. 현재 bootstrap package를 host에 sync한다.
3. host에서 `python3 ... verify`를 실행한다.
4. app/data verify가 모두 통과해야 다음 full deploy로 진행한다.

즉 precheck는 host 내부에서 직접 아래를 증명해야 한다.

- app host:
  - Docker available
  - image map read 가능
  - account-access env render 가능
  - proof gateway config render 가능
  - proof slice containers start 가능
- data host:
  - device path 확인
  - mount 가능
  - PostgreSQL/Redis start 가능
  - role/database bootstrap 가능

## Lane Model

`bootstrap precheck`는 dev/candidate lane의 **persistent host sandbox**를 전제로 한다.

즉 규칙은 이렇다.

- bootstrap 변경을 검증할 때는 host를 disposable처럼 지우지 않는다.
- 먼저 existing dev hosts 위에서 precheck를 반복한다.
- bootstrap precheck가 통과한 뒤에만 full deploy를 돌린다.
- full deploy failure가 bootstrap이 아니라 topology/integration에서 나는지 분리한다.

단, lane이 아직 없거나 완전히 깨졌다면 `fresh create` 한 번은 필요하다.

## Operator Rule

새 canonical operator rule은 아래다.

1. bootstrap 로직을 바꿨다.
2. `bootstrap precheck`를 돌린다.
3. 실패하면 host에서 직접 수정/재검증한다.
4. 성공한 뒤에만 `cdk deploy`를 돌린다.

즉 `run을 반복하며 bootstrap을 디버깅한다`는 방식은 canonical path가 아니다.

## Acceptance

이 설계가 구현 완료로 간주되려면 아래가 필요하다.

1. app/data bootstrap 로직이 Python package로 분리됨
2. shell user-data는 thin launcher 역할만 남음
3. dev lane host 대상으로 bootstrap precheck를 독립 실행 가능
4. workflow 또는 documented operator loop가 `precheck -> deploy` 순서를 강제함
5. lesson과 runbook이 이 규칙을 정본으로 가리킴
