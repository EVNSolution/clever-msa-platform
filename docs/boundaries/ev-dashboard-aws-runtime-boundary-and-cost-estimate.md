# ev-dashboard AWS Runtime Boundary And Cost Estimate

기준 시점: 2026-04-15 KST

기준 리전: `ap-northeast-2` (Seoul)

이 문서는 현재 `ev-dashboard` canonical prod runtime 이 실제로 어떤 AWS 서비스를 사용 중인지와, 리포에 고정된 현재 스택 기준으로 월 비용을 얼마나 예상해야 하는지를 정리한다.

## Scope

이 문서의 범위는 아래 정본을 기준으로 한다.

- current runtime truth:
  - [../mappings/current-runtime-inventory.md](../mappings/current-runtime-inventory.md)
  - [../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md](../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md)
- infra ownership and stack truth:
  - `development/infra-ev-dashboard-platform/README.md` (out-of-band infra repo reference)
  - `development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts` (out-of-band infra repo reference)
  - `development/infra-ev-dashboard-platform/lib/config.ts` (out-of-band infra repo reference)

이 문서에서 말하는 비용은 AWS 계정의 실제 청구서가 아니라, 현재 리포에 고정된 스택 정의와 공식 AWS Price List 기준의 추정치다.

## Boundary

### 현재 사용 중인 AWS 서비스

현재 `ev-dashboard` canonical prod runtime 은 아래 AWS 서비스를 활용한다.

- `Amazon ECS on AWS Fargate`
  - `front-web-console`, `edge-api-gateway`, backend API/runtime 서비스를 태스크로 실행한다.
- `Elastic Load Balancing - Application Load Balancer`
  - `ev-dashboard.com`, `api.ev-dashboard.com` 진입점을 제공한다.
- `AWS Certificate Manager`
  - `ev-dashboard.com` + `api.ev-dashboard.com` public certificate 를 발급한다.
- `Amazon Route 53`
  - apex/API host alias record 를 가진다.
- `Amazon RDS for PostgreSQL`
  - stateful backend 서비스별 dedicated PostgreSQL instance 를 가진다.
- `Amazon ElastiCache for Redis`
  - 현재 `service-account-access` 전용 Redis 를 가진다.
- `AWS Secrets Manager`
  - DB credential, Django secret, JWT secret, telemetry ingest/dead-letter key 를 저장한다.
- `AWS Cloud Map`
  - ECS Service Connect private DNS namespace/resource 를 제공한다.
- `Amazon CloudWatch Logs`
  - 모든 ECS/Fargate container 로그를 수집한다.
- `Amazon ECR`
  - immutable SHA image 를 저장하고 ECS 가 이를 pull 한다.
- `Amazon VPC Public IPv4`
  - 현재 모든 ECS 서비스가 `publicSubnets + assignPublicIp: true` 로 실행되므로 in-use public IPv4 비용이 발생한다.

### 현재 스택이 직접 소유하지 않는 것

아래 항목은 현재 스택이 직접 생성/소유하지 않거나, 최소한 이 리포 기준의 billing boundary 에 포함하지 않는다.

- `VPC`, subnet, NAT gateway
  - 기존 네트워크를 import 해서 재사용한다.
- `WAF`, `CloudFront`, `S3`, `Lambda`, `SQS`, `SNS`, `SES`, `OpenSearch`, `EKS`
  - 현재 canonical prod stack 에 없다.
- legacy `EC2 + SSM + docker compose`
  - bridge lane/legacy reference 일 뿐 `ev-dashboard` canonical prod truth 가 아니다.

## Current Resource Shape

현재 문서와 CDK 스택을 합쳐 보면, 리소스 모양은 아래와 같다.

| 항목 | 현재 수량 | 근거 |
| --- | ---: | --- |
| Public ALB | 1 | `LoadBalancer` |
| ACM public certificate | 1 | apex + api SAN |
| Route53 alias record | 2 | apex, api |
| ECS cluster | 1 | `ev-dashboard-platform` |
| Active Fargate service | 25 | current runtime 26개 중 `service-telemetry-listener` 제외 |
| Inactive Fargate worker | 1 | `service-telemetry-listener`, `desired=0` |
| Active public IPv4 on tasks | 25 | active Fargate services 수와 동일하게 가정 |
| Public IPv4 on ALB | 2 | 2 AZ public subnet 가정 |
| Cloud Map resources | 약 26 | namespace 1 + Service Connect service 25 |
| PostgreSQL instance | 19 | dedicated `db.t4g.micro`, Single-AZ |
| Redis node | 1 | `cache.t4g.micro` |
| Secrets Manager secret | 46 | RDS generated secret 19 + app/generated secret 27 |

### Active Runtime Service Count Basis

현재 active runtime 기준 서비스는 아래 25개다.

- `front-web-console`
- `edge-api-gateway`
- `service-account-access`
- `service-organization-registry`
- `service-driver-profile`
- `service-personnel-document-registry`
- `service-vehicle-registry`
- `service-vehicle-assignment`
- `service-dispatch-registry`
- `service-delivery-record`
- `service-attendance-registry`
- `service-dispatch-operations-view`
- `service-driver-operations-view`
- `service-vehicle-operations-view`
- `service-settlement-registry`
- `service-settlement-payroll`
- `service-settlement-operations-view`
- `service-region-registry`
- `service-region-analytics`
- `service-announcement-registry`
- `service-support-registry`
- `service-notification-hub`
- `service-terminal-registry`
- `service-telemetry-hub`
- `service-telemetry-dead-letter`

아래 1개는 현재 생성은 가능하지만 운영 기준으로 비활성이다.

- `service-telemetry-listener`
  - `desired=0`
  - real MQTT broker endpoint/credential 확정 전까지 prod 비활성

## Monthly Cost Estimate

### Pricing Assumptions

월 비용 계산은 아래 고정 가정을 사용한다.

- 한 달 `730` 시간
- Fargate active task 1개당 `0.25 vCPU + 0.5 GB`
  - 현재 `config.ts` 기본값
- PostgreSQL instance 1개당
  - `db.t4g.micro`
  - Single-AZ
  - `20 GB` GP3 storage
- Redis node 1개당
  - `cache.t4g.micro`
- 모든 active ECS service 는 public subnet 에 올라가며 public IPv4 를 사용
- Route53 hosted zone 비용은 `ev-dashboard` 전용 zone 이라고 가정할 때만 포함
  - shared zone 이면 이 항목은 거의 제거 가능

### Fixed Or Near-Fixed Monthly Cost

| AWS 서비스 | 계산식 | 월 예상 비용 (USD) | 비고 |
| --- | --- | ---: | --- |
| ECS Fargate compute | `25 * (0.25 vCPU + 0.5 GB) * 730h` | `259.06` | active runtime 25개 기준 |
| VPC public IPv4 | `(25 task IP + 2 ALB IP) * 730h * 0.005` | `98.55` | 현재 `publicSubnets + assignPublicIp: true` 기준 |
| RDS PostgreSQL | `19 * ((0.025 * 730) + (20 * 0.131))` | `396.53` | `db.t4g.micro` + GP3 20GB |
| ElastiCache Redis | `1 * (0.024 * 730)` | `17.52` | `cache.t4g.micro` |
| ALB fixed hourly | `1 * (0.0225 * 730)` | `16.43` | LCU 제외 |
| Cloud Map resource | `26 * 0.10` | `2.60` | namespace 1 + service 25 가정 |
| Secrets Manager secret storage | `46 * 0.40` | `18.40` | API 호출 제외 |
| Route53 hosted zone | `1 * 0.50` | `0.50` | shared zone 이면 제외 가능 |
| ACM public certificate | `1 * 0` | `0.00` | public cert 무료 |

**고정 baseline 합계**

- dedicated hosted zone 포함: **`809.58 USD / month`**
- shared hosted zone 이라면: **`809.08 USD / month`**

### Usage-Based Monthly Cost

아래는 리포만으로 확정할 수 없는 항목이다. traffic, image retention, log volume 에 따라 달라지므로 baseline 총액에는 별도 합산하지 않는다.

| AWS 서비스 | 공식 단가 | 예시 |
| --- | --- | --- |
| ALB LCU | `0.008 USD / LCU-hour` | `1 LCU` 가 한 달 내내 유지되면 `5.84 USD / month` |
| CloudWatch Logs ingest | `0.76 USD / GB` | 로그 `10 GB` 유입이면 `7.60 USD` |
| CloudWatch Logs storage | `0.0314 USD / GB-month` | 같은 달 `10 GB` 보관이면 `0.314 USD` |
| Route53 DNS query | `0.40 USD / 1M queries` | 월 `1M query` 면 `0.40 USD` |
| ECR storage | `0.10 USD / GB-month` | 월 평균 `20 GB` 보관이면 `2.00 USD` |
| Secrets Manager API | `0.05 USD / 10,000 requests` | 10만 호출이면 `0.50 USD` |
| Cloud Map API | `1.00 USD / 1M calls` | 월 `1M call` 면 `1.00 USD` |

### Practical Working Budget

실무적으로는 아래 범위로 보는 것이 안전하다.

- **low-traffic baseline**
  - `809.58 USD / month`
- **low-traffic + small operational overhead**
  - 가정:
    - ALB `1` sustained LCU
    - CloudWatch Logs `10 GB / month`
    - ECR `20 GB / month`
    - Route53 DNS query `1M / month`
  - 예상:
    - `809.58 + 5.84 + 7.60 + 0.314 + 2.00 + 0.40`
    - 약 **`825.74 USD / month`**

즉, 현재 스택 모양을 유지한다면 **대략 `810 ~ 826 USD / month`** 를 `ev-dashboard` canonical prod 의 현실적인 운영 예산 시작점으로 보는 편이 맞다.

## Biggest Cost Drivers

현재 구조에서 비용 비중이 큰 항목은 아래다.

1. `RDS PostgreSQL`
   - `396.53 USD / month`
   - 전체 baseline 의 가장 큰 비중
2. `Fargate compute`
   - `259.06 USD / month`
3. `Public IPv4`
   - `98.55 USD / month`
   - 현재 모든 ECS service 가 public subnet 에 올라가는 설계의 직접 비용

## Cost Interpretation Notes

- 이 추정치는 **현재 리포에 적힌 스택 모양이 그대로 운영된다**는 전제다.
- 실제 청구서는 아래에 따라 더 커질 수 있다.
  - 외부 인터넷 egress
  - cross-AZ traffic
  - ALB LCU 증가
  - CloudWatch log volume 증가
  - ECR image retention 증가
  - RDS backup 이 allocated storage 를 넘어서는 경우
- 반대로 아래를 정리하면 baseline 을 바로 낮출 수 있다.
  - backend ECS service 를 private subnet + no public IPv4 로 이동
  - 불필요한 active service desired count 축소
  - ECR image retention 정책 정리
  - read-model/service DB 필요성 재검토가 가능한 곳은 storage footprint 최적화

## Service-Class Cost Heuristic

개별 CLEVER runtime service 관점에서 빠르게 보면 아래 정도로 이해하면 된다.

- front/gateway 같은 stateless service
  - 약 `10.36 USD / month` + public IPv4 + shared ALB/log 비용
- read-model API with no dedicated DB
  - 약 `10.36 USD / month` + public IPv4 + secret/log 비용
- stateful API with dedicated PostgreSQL
  - 약 `31.23 USD / month`
  - 계산: `Fargate 10.36 + RDS 20.87`
- `service-account-access`
  - 약 `48.75 USD / month`
  - 계산: `Fargate 10.36 + RDS 20.87 + Redis 17.52`
- `service-telemetry-listener`
  - 현재 `desired=0`
  - 현재 compute 기준 직접 비용 `0`

## Official AWS Pricing Sources

- Fargate: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/ap-northeast-2/index.json`
- RDS PostgreSQL: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/ap-northeast-2/index.json`
- ElastiCache Redis: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonElastiCache/current/ap-northeast-2/index.json`
- ALB: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSELB/current/ap-northeast-2/index.json`
- Route53: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRoute53/current/index.json`
- Secrets Manager: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSSecretsManager/current/ap-northeast-2/index.json`
- Cloud Map: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSCloudMap/current/ap-northeast-2/index.json`
- CloudWatch Logs: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonCloudWatch/current/ap-northeast-2/index.json`
- ECR: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECR/current/ap-northeast-2/index.json`
- Public IPv4: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonVPC/current/ap-northeast-2/index.json`
