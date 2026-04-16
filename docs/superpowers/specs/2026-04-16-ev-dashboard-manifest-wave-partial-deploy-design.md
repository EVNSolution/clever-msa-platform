# ev-dashboard Manifest Wave Partial Deploy Design

## Purpose

이 문서는 `ev-dashboard` EC2 runtime의 일상 배포 경로를 `full-service verification` 중심에서 `manifest-driven warm-host partial deploy` 중심으로 바꾸는 설계를 고정한다.

목표는 아래다.

1. 최소 단위의 app/data host 스택을 먼저 올려 둘 수 있어야 한다.
2. 서비스 repo의 이미지 게시와 infra 배포를 분리해야 한다.
3. infra run은 이번에 반영할 서비스와 image SHA를 추측하지 않고 명시적으로 받아야 한다.
4. 전체 서비스 재기동은 예외 상황으로 내리고, 평소에는 warm host에서 wave 단위 부분 반영을 기본값으로 삼아야 한다.
5. 이미 반복 학습한 run failure를 preflight와 manifest contract에서 먼저 차단해야 한다.

## Current Problem

현재 `infra-ev-dashboard-platform`는 immutable image URI를 직접 받아 EC2 runtime을 올릴 수 있지만, 운영자가 체감하는 기본 경로는 여전히 “전체 서비스 집합을 한 번에 다시 해석하는 배포”에 가깝다.

이 구조의 문제는 아래와 같다.

1. `full-service verification`이 신규 bring-up 증명에는 유용하지만, warm host 운영 배포까지 같은 무게로 다루게 만든다.
2. infra workflow가 많은 `*_IMAGE_URI`와 desired count를 동시에 읽기 때문에, “이번에 바뀐 서비스만 반영”이라는 운영 의도가 흐려진다.
3. 운영자가 이번 run의 변경 범위를 명시적으로 적지 않으면, host-side reconcile이 전체 fleet churn처럼 보이기 쉽다.
4. gateway/front가 뒤 서비스 준비보다 먼저 흔들리면, 실제 원인보다 큰 public smoke noise가 생긴다.

즉 현재 proof path는 존재하지만, **일상적인 최소 단위 운영 배포 path**가 문서와 계약으로 아직 고정되지 않았다.

## Locked Requirements

이번 설계에서 아래는 유지한다.

1. 서비스 repo는 build-only다.
2. release artifact 정본은 immutable ECR SHA image다.
3. infra repo는 runtime stack과 deploy entrypoint를 계속 소유한다.
4. public ingress는 `ALB + ACM + Route53`를 유지한다.
5. full-fleet verification은 비상 복구, empty-host rehearsal, deploy contract 변경 같은 예외 상황에만 남긴다.

이번 설계에서 아래를 새로 고정한다.

1. 일상 배포 기본값은 warm-host partial deploy다.
2. infra run은 `release_manifest_path`로 이번 반영 대상을 명시적으로 받는다.
3. wave 순서는 운영자가 매번 손으로 쓰지 않고 infra repo의 고정 정책으로 계산한다.
4. manifest에 없는 서비스는 이번 run에서 건드리지 않는다.

## Options Considered

### 1. Keep the current full-image env contract

구조:

- workflow가 계속 전체 `*_IMAGE_URI` 집합을 읽는다.
- 운영자가 환경 변수만 바꿔서 deploy한다.

장점:

- 현재 구조를 가장 적게 바꾼다.

단점:

- “이번에 무엇을 바꾸는가”가 명시적이지 않다.
- warm-host partial deploy보다 full-fleet churn 쪽으로 사고가 기운다.
- 같은 종류의 운영 실수가 다시 생기기 쉽다.

### 2. Pass only `changed_services`

구조:

- infra run input에 변경 서비스 이름만 넘긴다.
- 실제 image SHA는 runtime image map이나 다른 저장소에서 추론한다.

장점:

- 입력이 짧다.
- 변경 범위만 보면 단순하다.

단점:

- 정확한 image SHA를 결국 다른 곳에서 추론해야 한다.
- “추측 없는 배포” 요구와 충돌한다.

### 3. Pass `release_manifest_path` and compute waves in infra

구조:

- 서비스 repo는 각자 image build/push만 수행한다.
- infra run은 `release_manifest_path`만 입력으로 받는다.
- manifest에는 이번에 반영할 서비스와 exact image URI만 담긴다.
- infra repo가 고정된 wave 정책으로 부분 반영을 수행한다.

장점:

- 변경 범위와 target image가 완전히 명시적이다.
- 운영자가 추측 없이 review할 수 있다.
- warm-host partial deploy에 가장 잘 맞는다.

단점:

- manifest file 작성/관리 단계가 추가된다.

## Decision

이번 설계는 **3번, `release_manifest_path` + fixed wave policy**를 채택한다.

즉 운영 기본선은 아래와 같다.

```text
base stack bring-up
-> service repo image publish
-> infra workflow with explicit release manifest
-> wave-based warm-host partial deploy
-> public smoke
```

전체 서비스 신규 bring-up은 계속 가능하지만, 더 이상 일상 배포 기본선이 아니다.

## Target Operating Model

### 1. Base Stack Lane

먼저 최소 단위 stack을 올려 둔다.

- ALB
- ACM
- Route53 alias
- EC2 app host
- EC2 data host
- EBS
- runtime image-map parameter / secrets

이 단계는 자주 바꾸지 않는다.

이 lane의 목적은 “호스트와 공용 진입면이 살아 있는가”를 확보하는 것이다.

### 2. Image Publish Lane

서비스 repo는 아래만 한다.

- image build
- ECR push
- immutable SHA evidence 남김

이 단계에서는 infra stack을 바꾸지 않는다.

즉 image publish와 runtime deploy는 분리된다.

### 3. Release Manifest Lane

infra run은 더 이상 “현재 env에 있는 모든 `*_IMAGE_URI`”를 이번 배포의 truth로 해석하지 않는다.

대신 아래 입력을 받는다.

- `environment`
- `run_profile`
- `release_manifest_path`

manifest는 infra repo 안의 JSON file이다.

예시:

```json
{
  "release_id": "2026-04-16-dev-wave-01",
  "environment": "dev",
  "services": {
    "service-organization-registry": {
      "image_uri": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/service-organization-registry:2370d5a20de27aca93d96e0319c65bf17bf0c9d8"
    },
    "service-account-access": {
      "image_uri": "902837199612.dkr.ecr.ap-northeast-2.amazonaws.com/service-account-access:1dd502bc9f862a59e0328c2442022a3dff485780"
    }
  }
}
```

원칙은 아래다.

1. manifest에 적힌 서비스만 이번 run의 변경 대상이다.
2. manifest에 없는 서비스는 현재 runtime image map을 유지한다.
3. `latest` 같은 mutable tag는 금지한다.
4. unknown service key는 금지한다.

### 4. Wave Deploy Lane

wave 순서는 infra repo가 고정 정책으로 계산한다.

운영자가 매번 wave를 손으로 적지 않는다.

이유는 아래다.

1. 동일한 변경이라도 운영자가 다른 wave 순서를 적기 시작하면 재현성이 깨진다.
2. gateway/front는 마지막에 반영해야 public churn이 줄어든다.
3. dependency ordering은 개인 감이 아니라 deploy contract여야 한다.

현재 기본 wave 정책은 아래처럼 본다.

#### Wave 1: independent backend truth services

- `service-organization-registry`
- `service-account-access`
- `service-driver-profile`
- `service-personnel-document-registry`
- `service-vehicle-registry`
- `service-vehicle-assignment`
- `service-dispatch-registry`
- `service-delivery-record`
- `service-attendance-registry`
- `service-settlement-registry`
- `service-settlement-payroll`
- `service-region-registry`
- `service-announcement-registry`
- `service-support-registry`
- `service-notification-hub`
- `service-terminal-registry`
- `service-telemetry-hub`
- `service-telemetry-dead-letter`
- `service-telemetry-listener`

#### Wave 2: derived or operations services

- `service-dispatch-operations-view`
- `service-driver-operations-view`
- `service-vehicle-operations-view`
- `service-settlement-operations-view`
- `service-region-analytics`

#### Wave 3: edge

- `edge-api-gateway`

#### Wave 4: front

- `front-web-console`

핵심은 **backend first, edge later, front last**다.

### 5. Exceptional Full-Service Verification

`full-service verification`은 없어지지 않는다.

다만 아래 상황으로 scope를 내린다.

1. empty-host rehearsal
2. app host class 변경
3. deploy contract 변경
4. gateway profile / route map 구조 변경
5. disaster recovery rehearsal

즉 평소 서비스 변경은 partial deploy로 다루고, full verification은 예외적 증명 경로로만 남긴다.

## Runtime Behavior

warm host에서의 deploy는 아래처럼 동작해야 한다.

1. 현재 runtime image map을 읽는다.
2. manifest에 포함된 서비스만 new image URI로 override 한다.
3. wave 순서를 계산한다.
4. 각 wave마다 그 wave 서비스만 pull/restart 한다.
5. wave별 최소 smoke를 수행한다.
6. 마지막에 public smoke를 수행한다.

중요한 금지사항은 아래다.

1. manifest에 없는 서비스까지 full reconcile 하지 않는다.
2. periodic full reconcile timer로 live host를 흔들지 않는다.
3. “전체 fleet를 다시 맞추는 것”을 부분 배포의 기본 동작으로 삼지 않는다.

## Failure Prevention Rules

이번 설계는 run 중 사고가 아니라 run 전에 막는 데 초점을 둔다.

preflight는 아래를 먼저 차단해야 한다.

1. `release_manifest_path`가 없거나 file이 없는 경우
2. invalid JSON
3. duplicate service
4. unknown service key
5. mutable image tag
6. ECR에 존재하지 않는 tag
7. app host architecture와 맞지 않는 image
8. warm host가 존재하지 않거나 SSM online이 아닌 상태
9. `edge-api-gateway`나 `front-web-console`만 바꾸면서 선행 backend가 아직 준비되지 않은 상태
10. `full-service verification`이 아닌데 전체 fleet churn이 일어나는 설정

즉 이번 설계의 핵심은 “run에서 배운다”가 아니라 **“이미 배운 오류를 preflight와 manifest schema로 봉인한다”**다.

## Troubleshooting Model

문제 해석 순서도 바꾼다.

1. image publish 문제인가
2. manifest validation 문제인가
3. wave ordering 문제인가
4. host-side partial reconcile 문제인가
5. public smoke 문제인가

이 순서를 벗어나서 바로 재실행하지 않는다.

특히 아래는 금지한다.

- manifest 없는 blind rerun
- 전체 fleet full reconcile을 warm-host partial deploy의 대체재로 쓰는 것
- gateway/front churn이 보인다고 바로 infra topology를 의심하는 것

## Acceptance Criteria

이 설계는 아래가 만족되면 구현 가치가 있다고 본다.

1. base stack은 작은 기본 host로 계속 유지 가능하다.
2. 서비스 repo는 이미지 게시만 수행한다.
3. infra run은 `release_manifest_path` 없이는 partial deploy를 시작하지 않는다.
4. manifest에 없는 서비스는 run 중 재기동되지 않는다.
5. gateway/front는 wave 뒤쪽에서만 갱신된다.
6. full-service verification은 예외 경로로 남고, 일상 배포 기본선은 warm-host partial deploy가 된다.

## Out Of Scope

이번 설계는 아래를 포함하지 않는다.

1. 서비스 내부 business smoke 시나리오 상세
2. multi-account promotion
3. blue/green host pair
4. app host를 여러 대로 수평 확장하는 구조
5. deploy-control legacy repo를 다시 runtime owner로 되돌리는 작업
