# CLEVER Hub Ingress Formalization

> Historical status: 이 문서는 `hub.evnlogistics.com -> ALB -> edge-api-gateway`를 current ingress로 보던 초기 formalization snapshot이다. 현재 canonical public surface는 `ev-dashboard.com` / `api.ev-dashboard.com`이며, current truth는 [../../../mappings/current-runtime-inventory.md](../../../mappings/current-runtime-inventory.md) 와 [../../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md](../../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md)를 따른다.

## Purpose

이 문서는 현재 dev에서 사용 중인 정식 공개 경로를 기준으로 ingress 구조를 고정한다.

이번 문서의 범위는 아래다.

- current public domain `hub.evnlogistics.com`
- `ALB + ACM + Route53` 기반 공개 경로
- `ALB -> edge-api-gateway` 단일 진입점 구조

이번 문서의 범위 밖은 아래다.

- ECR/image 기반 배포 전환
- prod cutover 실행 절차 전체
- CloudFront/S3 정적 배포 분리

## Current State

현재 공개 상태는 아래와 같다.

- dev app host 위에 전체 스택이 올라와 있다.
- 외부 접근은 `hub.evnlogistics.com`을 통해 ALB로 들어온다.
- gateway는 이미 존재하고 `/`와 `/api/*`를 내부 라우팅한다.
- ACM 인증서가 적용돼 있다.
- Route53 alias가 ALB를 가리킨다.
- 임시 public `8080` 직접 공개는 제거됐다.

즉, ingress 경로는 dev에서 이미 운영형 구조로 닫혔고, 이 문서는 그 기준선을 고정한다.

## Primary Decision

정식 공개 경로는 아래 구조로 고정한다.

```text
Internet
-> Route53
-> ALB (HTTPS termination)
-> edge-api-gateway
-> "/" front runtime
-> "/api/*" backend services
```

핵심 결정은 다음과 같다.

1. ALB는 공개 ingress와 TLS termination만 담당한다.
2. 실제 앱 라우팅은 `edge-api-gateway`가 담당한다.
3. ALB에서 프론트와 API를 직접 분기하지 않는다.

## Why This Structure

### 1. 책임 분리가 명확하다

- ALB는 인증서, public exposure, health check, target registration만 담당한다.
- 앱 경로 구조(`/`, `/api/*`, 이후 추가 prefix)는 gateway가 담당한다.

즉, 인프라는 ingress를 소유하고 앱 경로는 gateway가 소유한다.

### 2. 경로 변경 시 인프라 변경을 최소화한다

ALB에서 path rule을 많이 들고 있으면, 프론트/API 구조가 바뀔 때마다 인프라까지 수정해야 한다.

현재 구조에서는 서비스 추가나 path 조정이 생겨도 대부분 gateway 설정 변경으로 끝낼 수 있다.

### 3. 현재 구조와 가장 자연스럽게 이어진다

이미 `edge-api-gateway`가 active runtime으로 있고, dev에서도 실제로 이 경로를 타고 있다.

즉, 지금 구조를 뒤엎지 않고 운영 ingress만 정식화하는 방향이다.

## Rejected Alternative

### `ALB -> front/api direct split`

이 구조는 이번 단계에서 채택하지 않는다.

이유:

1. ALB rule이 서비스 구조를 직접 안다.
2. gateway와 ALB가 path ownership을 나눠 가져 책임이 겹친다.
3. 향후 route 변경 시 인프라와 애플리케이션이 동시에 바뀌게 된다.

이 대안은 gateway를 없애거나, 프론트를 별도 정적 배포로 분리할 때 다시 검토한다.

## Target Architecture

### Public Entry

- domain: `hub.evnlogistics.com`
- DNS: Route53 public hosted zone 또는 해당 도메인의 authoritative DNS
- TLS: ACM public certificate
- listener:
  - `80` -> `443` redirect
  - `443` -> target group forwarding

### Load Balancer

- internet-facing ALB
- target group은 우선 `edge-api-gateway` 단일 target group
- health check는 gateway의 명시적 health endpoint를 사용한다

### Runtime Flow

- `https://hub.evnlogistics.com/`
  - gateway가 현재 프론트 runtime으로 reverse proxy
- `https://hub.evnlogistics.com/api/...`
  - gateway가 각 backend service로 reverse proxy

## Networking Model

### Security Groups

ALB SG:
- inbound `80/443` from internet
- outbound to gateway target port

App host SG:
- inbound from ALB SG only
- gateway target port만 허용
- 인터넷 전체로부터의 direct inbound는 제거

즉, 정식 전환 후에는 현재의 임시 `8080 from 0.0.0.0/0` 룰을 제거한다.

### Current Temporary Exposure

현재 public IP + `8080` 공개는 dev 확인용 임시 상태다.

정식 ingress가 붙으면 아래는 종료한다.

- public IP 직접 안내
- 임시 `8080` inbound 허용

## Certificate Strategy

1차는 `hub.evnlogistics.com` 기준으로 ACM public certificate를 발급하고 운영한다.

필요시 이후 단계에서 아래를 확장한다.

- `www` 여부
- `dev/stage/prod` 별도 host name
- wildcard certificate

이번 문서에서는 단일 대표 도메인 certificate만 가정한다.

## DNS Strategy

현재 canonical public name은 `hub.evnlogistics.com`이다.

DNS는 아래 원칙을 따른다.

1. 사용자 진입 주소는 ALB alias로 연결한다.
2. public IP를 직접 노출하는 주소는 운영 문서에서 제거한다.
3. dev/stage/prod 세부 분리 필요 시 별도 naming spec에서 정한다.

이번 문서에서는 대표 진입점 하나만 우선 고정한다.

## Gateway Requirements

정식 ingress 구조로 가기 위해 `edge-api-gateway`는 아래를 충족해야 한다.

1. 안정적인 health endpoint 제공
2. `/`와 `/api/*` 라우팅이 canonical domain에서도 정상 동작
3. host header 전달 정책이 backend와 충돌하지 않음
4. 프론트 dev server 또는 정식 front runtime으로의 reverse proxy가 안정적임

특히 이전에 확인된 `DisallowedHost`류 문제는 canonical domain 기준으로 다시 점검 대상이다.

## Rollout Sequence

정식화 순서는 아래를 권장한다.

1. 도메인/DNS 실제 소유 상태 확인
2. ACM certificate 발급
3. internet-facing ALB 생성
4. target group 생성 및 `edge-api-gateway` 연결
5. gateway health check 통과 확인
6. ALB SG / app host SG 정리
7. Route53 alias 연결
8. 외부 smoke test
9. 임시 `8080` 공개 제거

## Smoke Validation

정식 전환 시 최소 smoke는 아래다.

1. `GET /` -> front HTML 응답
2. `GET /api/org/companies/public/` -> 200 응답
3. 로그인 화면 렌더링
4. 주요 API 프록시 응답
5. ALB health check stable

## Risks

### 1. Front runtime가 아직 dev server 기반이다

현재 front는 dev server 성격이 강한 runtime으로 떠 있다.

즉 ingress 정식화는 가능하지만, 장기적으로는 front runtime packaging도 별도 정리 대상이다.

### 2. Gateway 설정 품질에 의존한다

단일 진입점 구조는 유지보수성이 좋지만, gateway 설정이 엉키면 모든 경로에 영향이 간다.

### 3. 임시 naming 상태와 맞물린다

현재 front naming은 임시 상태다. ingress는 그 위에서도 먼저 붙일 수 있지만, 이후 naming cleanup 시 문서와 운영 용어를 재정렬해야 한다.

## Done Criteria

이 트랙의 완료 기준은 아래다.

- `hub.evnlogistics.com`이 ALB를 가리킨다
- ACM TLS가 정상 적용된다
- ALB가 `edge-api-gateway`를 healthy로 본다
- `/`와 `/api/*`가 도메인 기준으로 정상 동작한다
- public IP + 임시 `8080` 공개를 제거한다

## Follow-up

이 문서 다음으로 이어질 상세 작업 문서는 아래다.

1. ingress implementation plan
- ALB, SG, ACM, Route53 실제 생성/변경 절차

2. frontend source-of-truth alignment spec
- 현재 front runtime naming과 정본 정렬

3. runtime/repo naming cleanup spec
- ingress 문서와 runtime naming의 일치화
