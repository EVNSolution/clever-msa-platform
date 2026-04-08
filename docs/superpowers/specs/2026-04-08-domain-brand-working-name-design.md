# CLEVER Domain and Brand Working Name

## Purpose

이 문서는 `CLEVER` 관리/운영 웹의 1차 working brand와 현재 사용 중인 public domain을 고정한다.

현재 목적은 “최종 브랜드를 영구 확정”하는 것이 아니라, 앞으로의 ingress, 문서, naming cleanup, 운영 커뮤니케이션에 쓸 기준 이름을 먼저 하나 정하는 것이다.

## Decision

현재 public working domain은 `hub.evnlogistics.com`으로 고정한다.

현재 시점에는 독립 apex domain(`clever-hub.com`, `clever-ops.com`)을 메인 이름으로 쓰지 않는다.

## Working Product Name

1차 working product name은 `Clever Hub`로 둔다.

이 이름은 아래 목적에 사용한다.

- 운영 웹 명칭
- 문서 상위 제목
- ingress 설계의 대표 이름
- 이후 repo/runtime naming 논의의 기준 이름

## Why `hub.evnlogistics.com`

`hub.evnlogistics.com`을 선택한 이유는 아래와 같다.

1. 운영/관리 웹의 의미를 담으면서도 범위를 너무 좁히지 않는다.
- `ops`는 운영 의미는 강하지만 배포/관제/설정 도구처럼 좁게 들릴 수 있다.
- `hub`는 운영, 관리, 포털, 제어 화면을 함께 담기 쉽다.

2. 현재 시스템의 실제 성격과 맞다.
- 지금 만들고 있는 것은 단순 배포 도구가 아니라 여러 서비스의 관리 웹이다.
- 따라서 “운영 허브”라는 인식이 더 적절하다.

3. 이미 소유 중인 회사 도메인에서 바로 운영 가능하다.
- `evnlogistics.com` Route53 존을 이미 운영 중이다.
- 별도 도메인 구매/이전 없이 `ALB + ACM + Route53` 구성을 즉시 닫을 수 있다.

4. 나중에 브랜드 도메인을 바꾸더라도 현재 단계의 canonical public endpoint로 쓰기 좋다.
- ingress, docs, rollout, UI 타이틀에 일단 하나의 기준을 줄 수 있다.
- 최종 브랜드 도메인 확정 전까지 운영 경로를 안정적으로 유지하기 쉽다.

## Why `clever-hub.com` Is Not Current Primary

`clever-hub.com`은 제품명과는 잘 맞지만, 현재 public primary로는 채택하지 않는다.

이유는 아래와 같다.

1. 현재 확보된 운영 도메인이 아니다.
- 독립 도메인 구매/등록이 아직 끝나지 않았다.

2. 이번 단계의 목표와 맞지 않는다.
- 지금은 branding 후보를 고정하는 것보다 실제 운영 ingress를 안정적으로 닫는 것이 우선이다.

3. 필요하면 나중에 교체할 수 있다.
- 제품명은 `Clever Hub`로 유지할 수 있다.
- public domain만 이후 별도 도메인으로 cutover 하면 된다.

## Scope of This Decision

이번 결정이 바로 의미하는 것은 아래다.

- 문서에서 1차 canonical 이름을 `Clever Hub`로 쓴다.
- 도메인 결정 spec과 이후 ingress spec에서 현재 public endpoint를 `hub.evnlogistics.com`으로 취급한다.
- 공개 경로 정식화 논의에서 대표 FQDN은 `hub.evnlogistics.com` 기준으로 설계한다.

이번 결정이 아직 의미하지 않는 것은 아래다.

- 독립 브랜드 도메인 구매 완료
- Route53 hosted zone 생성 완료
- 최종 브랜드 영구 확정
- 기존 `EVN*` 계열 명칭과의 관계 최종 확정

## Constraints

현재 이 결정은 working decision이다.

즉, 아래 상황에서는 바뀔 수 있다.

- 실제 도메인 확보 실패
- 기존 회사 도메인 정책 변경
- 법적/브랜드 이슈
- 회사 차원의 naming 방향 변경

하지만 그 전까지는 이 이름을 canonical working name으로 쓴다.

## Downstream Impact

이 결정은 다음 트랙의 입력값이 된다.

1. 공개 진입점 정식화
- `ALB + ACM + Route53` 설계를 `hub.evnlogistics.com` 기준으로 진행

2. 프론트/운영 웹 naming
- UI title, login heading, docs naming 기준점 제공

3. 레포/런타임 네이밍 정리
- 프론트 naming 논의 시 “무엇을 대표 이름으로 삼는가” 기준 제공

## Follow-up Documents

이 문서 다음으로 바로 내려갈 상세 문서는 아래다.

1. `ingress formalization` spec
- `hub.evnlogistics.com` 기준 공개 경로

2. `frontend source-of-truth alignment` spec
- 현재 임시 프론트 정본/배포 정본 불일치 해소

3. `runtime/repo naming cleanup` spec
- 프론트와 운영 자산 naming 일관화

## Acceptance

이 문서가 승인되면, 이후 문서와 계획에서는 아래를 기본값으로 사용한다.

- product working name: `Clever Hub`
- current public working domain: `hub.evnlogistics.com`
