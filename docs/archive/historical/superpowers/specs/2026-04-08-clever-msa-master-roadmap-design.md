# CLEVER MSA Master Roadmap

> Historical status: 이 문서는 `hub.evnlogistics.com`을 공개 기준으로 두던 초기 시점의 로드맵 snapshot이다. 현재 canonical public surface는 `ev-dashboard.com` / `api.ev-dashboard.com`이며, current truth는 [../../../mappings/current-runtime-inventory.md](../../../mappings/current-runtime-inventory.md) 와 [../../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md](../../../rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md)를 따른다.

## Purpose

이 문서는 현재 `CLEVER` MSA 전환 작업의 큰 축을 기억하기 위한 마스터 로드맵이다.

목적은 세 가지다.

1. 앞으로 무엇을 어떤 순서로 결정해야 하는지 잊지 않게 한다.
2. 이미 닫힌 작업과 아직 임시 상태인 작업을 구분한다.
3. 이후 각 항목별 상세 설계/상세 계획 문서를 만들 때 기준점으로 쓴다.

이 문서는 구현 체크리스트가 아니다. 각 트랙의 상세 작업은 별도 spec/plan 문서로 내린다.

## Current Baseline

현재 기준으로 이미 닫힌 축은 아래다.

- `development/` 아래 서비스들은 독립 repo 기준으로 분리됐다.
- 중앙 배포 제어는 `EVNSolution/clever-deploy-control`로 분리됐다.
- `GitHub Actions + AWS OIDC + EC2 app-host + SSM + docker compose` 배포 경로는 dev에서 실제 검증됐다.
- 주요 서비스와 묶음 배포는 dev에서 성공했다.
- 프론트 canonical/runtime repo와 compose runtime service는 모두 `front-web-console` / `web-console`으로 수렴했다.
- 외부 공개는 `hub.evnlogistics.com -> ALB -> edge-api-gateway` 정식 ingress 경로로 동작 중이다.

즉, 지금은 “배포 레이어를 만드는 단계”는 넘겼고, “정식 운영 구조로 수렴시키는 단계”에 들어왔다.

## Prioritization Principles

로드맵의 우선순위 원칙은 아래와 같다.

1. 이름보다 계약을 먼저 닫지 않는다.
- 이름 정리는 중요하지만, 공개 경로와 배포 계약이 불안정하면 naming만 맞춰도 운영이 불안정하다.

2. 임시 운용 상태를 오래 끌지 않는다.
- 특히 프론트 정본/배포 정본 불일치, public IP 직결, host-side git 같은 임시 구조는 빨리 정리해야 한다.

3. 운영 리스크를 먼저 줄인다.
- ingress, health check, rollback, seed 정책처럼 운영에 직접 영향을 주는 항목이 문서 이름 정리보다 우선이다.

4. 각 트랙은 독립 문서로 분리한다.
- 이 문서는 큰 방향만 유지하고, 상세 의사결정은 별도 문서로 내린다.

## Track 1. Domain and Brand Naming

### Goal

외부 공개와 제품 인지에 모두 쓸 수 있는 최종 브랜드/도메인 이름을 확정한다.

### Current State

- `evnlogistics.com`은 과거 운영 흔적이 있다.
- 회사명은 `EVNSolution`이다.
- `clever` 단독 브랜드와 회사 브랜드의 결합 방식이 아직 미확정이다.
- subdomain 방식과 독립 도메인 방식 중 최종 결정이 나지 않았다.

### Why It Matters

- ALB, ACM, Route53, 운영 화면 주소, 제품명, 문서, 사용자 커뮤니케이션이 모두 여기에 묶인다.
- 이 결정이 늦어질수록 ingress 정식화와 naming 정리가 같이 지연된다.

### Risks

- 브랜드명과 실제 소유 가능한 도메인이 불일치할 수 있다.
- 제품명과 회사명 결합이 어색하면 이후 repo/runtime naming에도 일관성이 깨질 수 있다.

### Dependencies

- 없음. 다만 공개 경로 정식화 전에 결정되는 것이 이상적이다.

### Done Criteria

- 제품명 확정
- 실제 확보 가능한 도메인 확정
- dev/stage/prod 주소 규칙 확정
- 문서와 운영 커뮤니케이션에서 쓸 canonical naming 확정

### To Expand Later

- 브랜드 후보 비교
- 도메인 소유 가능성 조사
- 최종 naming 규칙 표준화

## Track 2. Public Ingress Formalization

### Goal

현재의 임시 public IP 공개를 중단하고 `ALB + ACM + Route53 + SG` 기반의 정식 공개 경로로 전환한다.

### Current State

- 현재 dev는 EC2 public IP와 임시 `8080` 공개로만 접근 가능하다.
- ALB가 없다.
- 도메인이 연결되어 있지 않다.
- 보안그룹 inbound도 임시 룰이다.

### Why It Matters

- 지금 상태는 확인용으로는 충분하지만 운영용으로는 부적절하다.
- HTTPS, DNS, SG 최소 권한, ingress 관측성 모두 이 단계가 있어야 가능하다.

### Risks

- public IP 직결은 인스턴스 교체/재생성 시 주소가 흔들린다.
- 인증서와 브라우저 신뢰 경로를 만들 수 없다.
- 임시 개방 포트가 오래 유지되면 운영 부채가 된다.

### Dependencies

- Track 1의 도메인 결정이 선행되면 가장 깔끔하다.

### Done Criteria

- 도메인이 ALB alias로 연결됨
- ACM 인증서 적용 완료
- EC2는 ALB source만 허용하도록 SG 정리
- public IP 직결 의존 제거

### To Expand Later

- dev/stage/prod ingress topology
- ALB listener/rule 설계
- DNS cutover 절차

## Track 3. Frontend Source-of-Truth Alignment

### Goal

현재 임시로 맞춰둔 프론트 정본/배포 정본 불일치를 해소한다.

### Current State

- 실제 정본과 배포 repo 이름은 현재 `front-web-console`로 맞춰졌다.
- dev 런타임 compose service도 `web-console`로 수렴했다.
- 즉 프론트 repo/path/runtime naming cutover는 Stage B까지 완료된 상태다.

### Why It Matters

- 지금 상태는 배포를 빠르게 살리기 위한 임시 전환이다.
- 이 상태를 오래 끌면 문서/배포/개발 인지가 모두 어긋난다.

### Risks

- 누가 정본인지 혼동된다.
- 이후 프론트 수정이 잘못된 repo로 들어갈 수 있다.
- compose/catalog/runtime naming 정리 시 충돌한다.

### Dependencies

- 없음. 다만 Track 4와 묶어서 정리하는 것이 자연스럽다.

### Done Criteria

- 프론트 정본 repo가 명확히 하나로 정리됨
- 현재 배포 대상과 정본 repo가 일치함
- 임시 스냅샷 이식 상태가 종료됨

### To Expand Later

- 현재 프론트 repo 관계 정리
- 어떤 repo를 남기고 어떤 repo를 archive/remove할지 결정
- runtime/compose/catalog 정합성 정리

## Track 4. Repository and Runtime Naming Cleanup

### Goal

프론트를 포함한 전체 repo/runtime/deploy target naming을 일관되게 정리한다.

### Current State

- 런타임 이름, repo 이름, compose service 이름, gateway 경로, 문서명이 완전히 일치하지 않는 구간이 남아 있다.
- 특히 프론트 영역이 가장 크다.

### Why It Matters

- naming이 일관돼야 운영자와 개발자가 같은 객체를 같은 이름으로 부를 수 있다.
- catalog, docs, repo, runtime 간 drift를 줄일 수 있다.

### Risks

- 이름 정리를 성급하게 하면 배포 target과 실제 repo 관계가 깨질 수 있다.
- 문서만 바꾸고 runtime 이름을 안 바꾸면 더 혼란스러워질 수 있다.

### Dependencies

- Track 3의 프론트 정본 정리가 선행되는 것이 안전하다.
- 일부 항목은 Track 1의 브랜드 결정과도 연결될 수 있다.

### Done Criteria

- canonical naming set 문서화
- repo 이름과 runtime/compose/catalog target 이름 일치
- 불필요한 legacy 이름 제거 또는 archive 이동

### To Expand Later

- repo rename 대상
- compose service rename 대상
- gateway path 영향 범위
- 문서/배포 catalog 동기화 절차

## Track 5. Deployment Contract Migration

### Goal

현재의 `host-side git + compose build` 배포 계약을 `image/ECR` 중심 계약으로 전환한다.

### Current State

- 현재 배포는 EC2 host가 private repo를 clone/pull하고 host에서 build하는 구조다.
- 이 구조는 이미 dev에서 동작 검증은 끝났다.
- 하지만 host가 GitHub read token과 source workspace를 계속 가져야 한다.

### Why It Matters

- 장기적으로 가장 큰 구조 개선 축이다.
- build 위치를 host에서 분리해야 운영 리스크와 배포 시간이 줄어든다.

### Risks

- sibling repo build context 문제
- host workspace drift
- host-side git credential 유지 필요
- rollback이 source 기준으로 복잡해짐

### Dependencies

- Track 4 naming 정리가 일부 선행되면 좋다.
- 하지만 기술적으로는 독립 추진 가능하다.

### Done Criteria

- 서비스별 image build 경로 확정
- ECR repository 체계 확정
- compose deploy는 `image:` 기반으로 전환
- host는 source checkout 없이 image pull만 수행

### To Expand Later

- source deploy -> image deploy 전환 단계
- build 주체를 GitHub Actions로 둘지 AWS CodeBuild/CodeConnections로 넘길지 결정
- rollback 기준을 image tag 중심으로 재정의

## Track 6. Operational Hardening

### Goal

현재 “배포는 된다” 수준을 “운영이 안전하다” 수준으로 끌어올린다.

### Current State

- preflight는 추가됐다.
- 주요 서비스와 묶음 배포는 dev에서 검증됐다.
- 시드 계정과 DB persistence도 dev 기준으로 확인됐다.
- 하지만 health, smoke, rollback, seed, observability는 아직 최소 수준이다.

### Why It Matters

- 배포 성공과 운영 안정성은 다르다.
- 운영 단계에서 반복될 문제를 줄이려면 이 트랙이 필요하다.

### Risks

- health check가 컨테이너 상태 중심이라 기능 고장을 놓칠 수 있다.
- seed 정책이 환경별로 명확하지 않으면 prod에서 위험하다.
- 장애 대응 시 어디를 먼저 봐야 하는지 기준이 약하다.

### Dependencies

- 없음. 다른 트랙과 병행 가능하다.

### Done Criteria

- 환경별 seed 정책 문서화
- 핵심 HTTP health/smoke check 마련
- rollback 실행 기준 문서화
- 기본 운영 로그/진단 포인트 정리

### To Expand Later

- login smoke
- 핵심 API smoke
- env별 seed 허용 범위
- 장애 triage 순서

## Track 7. Production Cutover

### Goal

현재 dev에서 검증한 구조를 prod로 안전하게 확장한다.

### Current State

- prod용 cutover checklist 초안은 있다.
- 하지만 실제 prod host, ingress, secrets, seed, smoke 절차는 아직 실행 전이다.

### Why It Matters

- 지금까지의 작업은 대부분 dev에서 닫혔다.
- 실제 운영 가치가 생기려면 prod 전환 기준을 명확히 해야 한다.

### Risks

- dev에서 허용되는 seed/임시 공개/임시 naming 상태를 prod에 그대로 가져가면 안 된다.
- prod에서 첫 배포는 기술 이슈보다 운영 절차 이슈가 더 크게 작용한다.

### Dependencies

- Track 1, 2, 6은 사실상 prod 이전에 닫히는 것이 바람직하다.

### Done Criteria

- prod ingress 준비 완료
- prod secrets/roles/host 준비 완료
- prod smoke/rollback 절차 확정
- first rollout sequence와 stop condition 확정

### To Expand Later

- first prod rollout checklist
- rollback criteria
- post-deploy validation

## Suggested Decision Order

실제 의사결정 순서는 아래를 권장한다.

1. Track 1 `도메인/브랜드`
2. Track 2 `공개 진입점 정식화`
3. Track 3 `프론트 정본/배포 정본 일치`
4. Track 4 `레포/런타임 네이밍 정리`
5. Track 6 `운영 안정화`
6. Track 5 `배포 계약 전환`
7. Track 7 `prod cutover`

설명:

- Track 1, 2는 외부 공개와 사용자 진입 경로를 닫기 위해 먼저 필요하다.
- Track 3, 4는 현재 임시 프론트 상태를 장기 구조로 정리한다.
- Track 6은 현재 구조를 안전하게 운영하기 위해 필요하다.
- Track 5는 장기 구조 개선이지만, 지금 당장 서비스를 공개하는 데는 선행 필수는 아니다.
- Track 7은 나머지 트랙의 결과를 바탕으로 마지막에 닫는다.

## Things Intentionally Not Decided Here

이 문서에서 일부러 상세 결정을 하지 않는 항목은 아래다.

- 최종 브랜드 후보 비교표
- ALB 세부 listener/rule 설계
- 프론트 repo 통폐합 방식
- repo rename 실행 절차
- ECR repository naming 상세
- CodeBuild/CodeConnections 전환 여부
- prod rollout 세부 체크리스트

이 항목들은 각 트랙의 상세 spec/plan 문서에서 다룬다.

## Next Documents To Write

이 문서 다음으로 내려갈 상세 문서는 아래 순서를 권장한다.

1. 도메인/브랜드 결정 spec
2. ingress 정식화 spec
3. 프론트 정본/배포 정본 정렬 spec
4. naming cleanup spec
5. deployment contract migration spec
6. operational hardening plan
7. prod cutover execution plan
