# ev-dashboard.com ECS Cutover Plan

## Purpose

이 문서는 `ev-dashboard.com` 도메인을 새 `GitHub Actions + OIDC + ECR + CDK + ECS/Fargate` 런타임으로 전환하기 위한 현재 상태 확인과 cutover 순서를 고정한다.

## Verified Current State (2026-04-13)

### Domain and DNS

- `ev-dashboard.com` apex A record는 현재 `3.36.109.200`을 가리킨다.
- authoritative public hosted zone은 `Z0258898ULH367BASCGC` 이다.
- `route53domains get-domain-detail` 기준, `ev-dashboard.com` 도메인 등록 자체도 현재 AWS 계정에서 조회된다.
- registrar는 `Amazon Registrar, Inc.` 이고 registrant organization은 `이브이앤솔루션(주)`로 확인됐다.
- 현재 NS는 아래와 일치한다.
  - `ns-124.awsdns-15.com.`
  - `ns-1595.awsdns-07.co.uk.`
  - `ns-611.awsdns-12.net.`
  - `ns-1415.awsdns-48.org.`
- apex TTL은 `60`초다.

### TLS and HTTP

- `https://ev-dashboard.com` 는 현재 `200 OK`를 반환한다.
- `http://ev-dashboard.com` 는 `301 -> https://ev-dashboard.com/` 으로 리다이렉트된다.
- 현재 TLS 인증서는 `CN=ev-dashboard.com`, issuer `Let's Encrypt E7`, 만료 `2026-07-12 05:55:04 GMT`다.

### Current runtime ownership

- 동일 이름의 public hosted zone이 하나 더 있다: `Z05744782YFUEQT1X0VOU`.
- 하지만 현재 authority는 이 zone이 아니라 `Z0258898ULH367BASCGC`다.
- 현재 apex target `3.36.109.200`은 현재 AWS 계정 `902837199612` 안의 ECS task ENI로 확인됐다.
- ENI `eni-0c122d99c7484be4f` 는 `ap-northeast-2a` 에 붙어 있고, 현재 `test-test-sh` ECS cluster의 running task에 연결돼 있다.
- 현재 service는 `test-test-sh-ServiceD69D759B-1sgRGfW0Wmov`, launch type은 `FARGATE`, desired/running count는 `1`이다.
- 현재 task definition family는 `testtestshTaskDef2D637C2B`, active revision은 `4`다.
- 현재 container는 `nginx + Express` 형태로 응답하며, CloudWatch Logs 그룹은 `/ecs/test-test-sh` 다.
- 현재 runtime은 `ALB + ACM` 구조가 아니라 아래 형태다.
  - `Route53 apex A -> Fargate task public IP`
  - task startup 중 Route53 A record를 직접 갱신
  - task 내부 `certbot` 으로 `ev-dashboard.com` 인증서 발급
  - 인증서는 EFS volume에 저장 후 재사용

### Observed rollout timeline (2026-04-13, KST)

- `2026-04-13 14:42:16` `aws-cdk-runner` 세션이 `test-test-sh` CloudFormation change set 생성
- `2026-04-13 14:42:24` 같은 세션이 change set 실행
- `2026-04-13 14:42:28` CloudFormation이 ECS cluster `test-test-sh` 생성
- `2026-04-13 15:23:53` ECS service 생성
- `2026-04-13 15:24:17` 첫 task 시작
- `2026-04-13 15:24:58` 앱 로그에 `No domain configured, running HTTP only`
- `2026-04-13 15:52:46` 앱 로그에 `Updating Route53 A record: ev-dashboard.com -> 15.165.12.216`
- `2026-04-13 15:52:57` 첫 Let's Encrypt 검증 실패. 원인 로그는 `no valid A records found for ev-dashboard.com`
- `2026-04-13 15:53:38` 인증서 발급 성공
- `2026-04-13 15:56:42` ECS deployment 실패 후 이전 revision으로 rollback
- `2026-04-13 15:59:22` rollback revision이 steady state 도달
- `2026-04-13 16:07:39` task definition revision `4` 등록
- `2026-04-13 16:07:42` service가 revision `4` 로 update
- `2026-04-13 16:08:47` 앱 로그에 `Updating Route53 A record: ev-dashboard.com -> 3.36.109.200`
- `2026-04-13 16:08:53` 앱 로그에 `Certificate already exists, activating SSL config`
- `2026-04-13 16:12:03` 현재 revision이 steady state 도달

### Hosting Subject

- 현재 호스팅 주체는 `test-test-sh` CloudFormation stack 이다.
- stack create/update는 `aws-cdk-runner` 세션이 `cdk-hnb659fds-deploy-role-902837199612-ap-northeast-2` 를 사용해 실행했다.
- 실제 리소스 생성/수정은 CloudFormation이 `cdk-hnb659fds-cfn-exec-role-902837199612-ap-northeast-2` 로 수행했다.
- `CreateChangeSet`/`ExecuteChangeSet` CloudTrail 기준 source IP는 `48.214.55.33`, user agent는 `aws-sdk-js/... aws-cdk/2.1118.0` 으로 남아 있다.
- 즉 현재 배포는 **우리 AWS 계정 안에서 CDK deploy로 만들어진 stack** 으로 보는 것이 맞다.
- 다만 현재 로컬 CLEVER workspace 와 현재 GitHub 설치 범위에서는 이 stack source repo 가 확인되지 않았다.
- 따라서 현재까지 확인 가능한 hosting subject의 가장 정확한 표현은 아래다.
  - **AWS 계정 902837199612 안의 CDK/CloudFormation 배포 stack**
  - **session name `aws-cdk-runner` 로 실행된 배포**
  - **source repo 는 현재 workspace 밖 또는 현재 GitHub 설치 범위 밖**

### User-confirmed replacement authority

- 사용자 확인 기준, `test-test-sh` 는 **테스트용 stack** 이다.
- 따라서 새 CLEVER runtime이 `ev-dashboard.com` ownership을 가져가도록 **덮어쓰기 / 교체 / 필요 시 stack 삭제**를 진행해도 된다.
- 이 결정으로 `test-test-sh` 는 보존 대상이 아니라 **retire 가능한 disposable runtime** 으로 본다.

## Current Interpretation

정리하면 아래다.

1. `ev-dashboard.com` 은 **우리 AWS 계정에서 등록/Route53 제어 가능한 도메인**이다.
2. 이 도메인은 **현재 같은 AWS 계정의 CDK/ECS/Fargate test stack** 위에서 실제 HTTPS 서비스를 제공 중이다.
3. 따라서 “바로 사용 가능”의 의미는
   - DNS 권한 측면: `예`
   - 무중단 없이 즉시 덮어써도 되는 빈 도메인 측면: `아니오`
4. 현행 runtime은 `Route53 direct-to-task IP + task-internal certbot` 구조라서, 새 cutover는 blank domain 신규 오픈이 아니라 **기존 Fargate direct-IP runtime을 ALB/ACM 구조로 교체하는 migration** 으로 봐야 한다.
5. 사용자 승인 기준으로 `test-test-sh` 는 테스트용 disposable stack 이므로, 새 runtime cutover 시 교체 또는 삭제할 수 있다.
6. 단순히 apex A record만 지우는 것은 충분하지 않다.
   - 현재 task 는 startup 때 Route53 A record를 다시 갱신한다.
   - 즉 기존 `test-test-sh` stack 을 stop/retire 하지 않으면, A record를 비워도 다음 task restart 때 다시 `ev-dashboard.com` 을 점유할 수 있다.
7. 현재 남은 핵심 과제는 `ownership 확인`이 아니라 아래다.
   - 새 ALB/ACM runtime 구현
   - 기존 `test-test-sh` stack retire 순서 고정
   - Swagger + Django admin ingress 추가

## Target Runtime Direction

이번 전환의 target runtime은 아래로 잡는다.

```text
GitHub Actions
-> OIDC role assume
-> ECR push
-> CDK deploy
-> ECS/Fargate
-> ALB
-> Route53 alias (ev-dashboard.com)
```

## Recommended Runtime Shape

### Entry and TLS

- public ALB를 `ap-northeast-2`에 둔다.
- `ev-dashboard.com` 용 ACM 인증서를 같은 region에 발급한다.
- `api.ev-dashboard.com` 용 ACM 인증서도 같은 region wildcard 또는 SAN 구성으로 같이 발급한다.
- HTTPS 종료는 ECS task 내부 Nginx/certbot이 아니라 **ALB + ACM** 에서 한다.
- listener 정책:
  - `80` -> `443` redirect
  - `443` -> target group routing

### Public endpoint map

새 runtime의 public entrypoint는 아래로 고정하는 것을 권장한다.

- `https://ev-dashboard.com/`
  - `front-web-console`
  - 사용자-facing web console
- `https://api.ev-dashboard.com/`
  - `edge-api-gateway`
  - browser/API/mobile 공통 API ingress
- `https://api.ev-dashboard.com/swagger/`
  - unified Swagger UI
- `https://api.ev-dashboard.com/redoc/`
  - optional Redoc
- `https://api.ev-dashboard.com/openapi.yaml`
  - unified OpenAPI artifact
- `https://api.ev-dashboard.com/admin/account-access/`
  - `service-account-access` Django admin
  - 최소 1차는 account/auth governance 용 admin만 노출

중요 제약:

- `ev-dashboard.com/admin/*` 는 이미 `front-web-console` 의 시스템 관리자 UI namespace 와 충돌한다.
- 따라서 Django admin을 apex host의 `/admin/` 아래 두지 않는다.
- Django admin은 별도 host(`api.ev-dashboard.com`) 또는 별도 ops host로 분리한다.

### ECS services

도메인 목적이 “대시보드 웹 진입점”이라면 1차 pilot은 아래를 권장한다.

- `front-web-console`
  - path: `/`
  - role: 메인 웹 콘솔
- `edge-api-gateway`
  - path: `/api/*`
  - role: backend API entrypoint
- `service-account-access`
  - role: auth, session, identity, Django admin, service-owned schema source
  - admin/doc 노출의 1차 anchor service

이 조합이 현재 runtime inventory와 가장 잘 맞는다.

### Swagger and Django admin exposure

현재 CLEVER 소스 기준으로 아래가 맞다.

- OpenAPI schema source는 이미 `service-account-access` 가 `drf-spectacular` 기반을 일부 갖고 있다.
- 하지만 runtime URL에는 schema/Swagger view가 아직 연결되어 있지 않다.
- Django admin도 아직 `django.contrib.admin` 이 settings/urls 에 연결되어 있지 않다.

따라서 1차 구현 범위는 아래로 잡는다.

1. `service-account-access`
   - `django.contrib.admin` 활성화
   - `accounts/admin.py` 추가
   - `drf-spectacular` schema, swagger, redoc URL 연결
2. `edge-api-gateway`
   - `/api/auth/` 외에 docs/admin forwarding path 추가
   - 예: `/swagger/`, `/redoc/`, `/openapi.yaml`, `/admin/account-access/`
3. ECS ingress
   - `api.ev-dashboard.com` host header를 edge-api-gateway 로 보냄
   - gateway 내부에서 auth/admin/docs path 분기

보안 원칙:

- Django admin은 public-open endpoint로 두지 않는다.
- 최소한 아래 중 하나를 건다.
  - ALB listener auth
  - source IP allowlist
  - gateway basic auth / SSO
- Swagger는 read-only 공개가 가능하더라도 write-capable Django admin과 같은 보호 수준으로 다루지 않는다.

### Networking

현재 CLEVER ECS 문서 기준을 그대로 따른다.

- ALB: public subnet
- Fargate service: public subnet + `assignPublicIp: true`
- NAT gateway는 만들지 않는다.
- security group:
  - ALB: `80/443` inbound
  - ECS task: ALB SG에서 온 app port만 허용

### Deploy ownership

- image build: repo-local GitHub Actions
- deploy: repo-local ECS/CDK workflow 또는 pilot 전용 workflow
- environment gate: GitHub Environment approval
- rollback unit: image tag + task definition revision

## Cutover Strategy

### Phase 0. Current runtime retirement confirmation

먼저 아래를 확인한다.

- 기존 `test-test-sh` stack 을 cutover 직전 scale-down 할지, cutover 직후 delete 할지 결정
- rollback 용도로 기존 direct-IP runtime을 몇 시간 또는 며칠 유지할지 결정
- 기존 stack/task가 Route53 A record를 다시 점유하지 않도록 retire 순서를 고정
- 삭제 경로:
  - 최소: ECS service scale to 0 또는 task 중지
  - 권장: `test-test-sh` stack 전체 delete

이 확인 없이는 기존 runtime을 제거하지 않는다.

### Phase 1. Parallel ECS validation

도메인 본 컷오버 전에 새 ECS runtime을 병렬로 검증한다.

권장 검증 순서:

1. `front-web-console` ECS/CDK stack 생성
2. 필요하면 `edge-api-gateway` ECS/CDK stack 생성
3. ALB DNS name으로 직접 접속 검증
4. Route53에 임시 검증 레코드 추가
   - 예: `next.ev-dashboard.com`
5. `api.ev-dashboard.com` 에서 Swagger/OpenAPI 확인
6. `api.ev-dashboard.com/admin/account-access/` 접근 제어 확인
7. HTTPS, health check, 로그, rollback 검증

즉, `ev-dashboard.com` apex를 바로 실험용으로 쓰지 않는다.

### Phase 2. ACM and Route53 preparation

1. authoritative zone `Z0258898ULH367BASCGC`에서 ACM DNS validation을 완료한다.
2. apex alias 전환 전 아래를 준비한다.
   - `A/AAAA alias -> ALB`
   - `api.ev-dashboard.com A/AAAA alias -> ALB`
   - optional: `www.ev-dashboard.com -> ALB` 또는 apex redirect 정책
3. stale duplicate zone `Z05744782YFUEQT1X0VOU`는 current authority가 아니므로 cutover blocker는 아니지만, 혼동 방지를 위해 later cleanup 대상으로 기록한다.

### Phase 3. Apex cutover

현재 TTL이 이미 `60`초이므로 짧은 cutover가 가능하다.

권장 절차:

1. 기존 `test-test-sh` runtime을 먼저 stop 또는 delete 해서 self-mutating Route53 write를 끊는다.
2. 새 ECS target group healthy 확인
3. ALB HTTPS 응답 확인
4. ACM cert in-use 확인
5. `ev-dashboard.com` apex A record를 `3.36.109.200`에서 `ALB alias`로 교체
6. `api.ev-dashboard.com` 을 `ALB alias`로 연결
7. 5~10분 동안 4xx/5xx, ALB target health, ECS task restart 여부를 집중 관찰

### Phase 4. Rollback

문제 발생 시 rollback은 아래 순서로 한다.

1. Route53 apex record를 기존 `3.36.109.200`으로 되돌린다.
2. ECS task definition은 이전 revision으로 rollback 가능하게 유지한다.
3. 단, rollback이 필요하면 `test-test-sh` 를 즉시 복구할 수 있는지 먼저 확인한다.
4. 원인 분석 후 재배포한다.

핵심은 **DNS rollback path를 먼저 보존**하는 것이다.

## Service-by-Service Recommendation

### Option A. Front-first pilot

가장 안전한 첫 전환:

- `front-web-console` 만 ECS로 올린다.
- API는 기존 backend target을 그대로 사용한다.
- 장점:
  - 사용자-facing domain을 먼저 ECS에 얹어볼 수 있다.
  - backend 전체를 동시에 옮기지 않아도 된다.

전제:

- `front-web-console` 이 기존 remote API target과 호환돼야 한다.

### Option B. Front + Edge pair cutover

도메인 진입점 전체를 같이 옮기려면:

- `front-web-console` + `edge-api-gateway` 를 같이 ECS로 올린다.
- `/` 는 front, `/api/*` 는 edge로 ALB rule을 둔다.
- 장점:
  - domain entrypoint를 runtime boundary까지 같이 정리할 수 있다.
- 단점:
  - first cutover scope가 커진다.

현재 기준으로는 **Option A -> Option B** 순서를 권장한다.

## Risks

### 1. Current runtime is direct-to-task and self-mutating

현재 `ev-dashboard.com` 은 task public IP를 apex A record에 직접 넣고, task가 Route53과 Let's Encrypt 발급을 직접 건드린다.
이 구조는 task 교체, IP 변경, certbot 재시도 실패에 취약하다.

### 2. Duplicate hosted zone confusion

`ev-dashboard.com` public zone이 2개 있다.
현재 authority는 하나만 쓰고 있지만, 사람 기준 혼동이 생기기 쉽다.

### 3. Source and deploy ownership still unclear

현재 runtime 자원은 같은 AWS 계정에서 보이지만, 어떤 repo 와 파이프라인이 이 stack 을 만들었는지는 아직 확정되지 않았다.
source of truth 없이 바로 교체하면 이후 운영 ownership이 다시 꼬일 수 있다.

### 4. Apex cutover without parallel validation

ECS/ALB/ACM 검증 없이 apex를 바로 바꾸면 장애 범위가 커진다.

### 5. Old stack can reclaim the domain if left running

기존 `test-test-sh` 는 startup 때 Route53 A record를 직접 갱신한다.
따라서 cutover 전에 stop/delete 하지 않으면 새 alias를 다시 덮어쓸 수 있다.

## Done Criteria

아래가 되면 cutover 준비가 완료된 것으로 본다.

1. 기존 `test-test-sh` retire 방식(scale-down 또는 delete) 확정 완료
2. `front-web-console` 또는 `front-web-console + edge-api-gateway` ECS stack dev 검증 완료
3. ACM validation 완료
4. `next.ev-dashboard.com` 같은 임시 검증 주소에서 HTTPS 확인 완료
5. apex alias cutover / rollback runbook 준비 완료
6. 기존 `test-test-sh` direct-IP runtime의 보존/폐기 기준 확정 완료
7. `api.ev-dashboard.com` Swagger 와 Django admin 접근 제어 검증 완료
