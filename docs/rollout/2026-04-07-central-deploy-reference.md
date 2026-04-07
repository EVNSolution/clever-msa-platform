# 중앙 배포 레이어 레퍼런스 (v0.1)

본 문서는 `clever-msa-platform`에서 실행할 **중앙 배포 레이어**의 운영 규칙을 정리한 기준 문서다.  
목표는 다음이다.

- GitHub 저장소는 기능/문서 수정, 리뷰 편의를 위해 하나의 모노 레포를 유지한다.
- 배포 실행점은 중앙화하여 `docs`에서 관리한다.
- 변경된 컴포넌트만 선택적 배포하고, 기본은 안전한 파형(wave) 순차 배포를 지킨다.

## 1) 배포 대상과 범위

아래 컴포넌트가 중앙 배포 레이어의 직접 대상이다.

- `edge-api-gateway`
- `front-admin-console`, `front-operator-console`
- `service-*` 계열 런타임 서비스

최종 런타임 정보(실제 배포 파이프라인, compose service, gateway prefix)는
`../mappings/current-runtime-inventory.md`를 소스로 사용한다.

## 2) 배포 트리거

- `main` 브랜치 push 시 자동 실행(기본 환경: `dev`).
- `workflow_dispatch` 수동 실행(환경/대상 지정 가능).
- `repository_dispatch` 기반 API 호출 실행(운영 자동화 시스템 연동용).

## 3) 변경 감지 규칙

`compute-targets.py`는 기본적으로 변경 파일 목록에서 변경 대상을 계산한다.

- 포함 대상:
  - `development/<repo>/...` 하위 변경
  - `<repo>`가 `front-*`, `edge-api-gateway`, `service-*` 일치
- 배포 제외 대상:
  - `.github/`, `.git/`, `docs/` 아래 변경
- 문서/마크다운만 변경된 경우:
  - 배포 자체를 스킵하고 `deploy_plan_validation_only=true`로 처리한다.
  - 단, `workflow_dispatch`에서 운영 환경을 강제 지정한 경우에도 docs-only는 기본적으로 스킵한다.

## 4) 배포 파동(wave) 전략

권장 실행 순서는 기본 카탈로그의 `wave` 순을 따른다.

1. core
   - `edge-api-gateway`, `front-*`
2. domain security / identity
   - `service-account-access` 등
3. 운영/조회 경로
   - read model 계열, analytics 계열
4. 나머지 도메인 서비스

각 wave 안에서는 동일 wave 내 의존성 정렬로 실행한다.  
실패 시 해당 wave에서만 롤백/재시도 대상이 되고, 다음 wave는 대기한다.

## 5) 승인과 게이트

현재 추천값:

- `dev`: 자동 배포
- `stage`: 수동 승인(승인자 1명)
- `prod`: 수동 승인 + 변경 요약 승인 + 롤백 드릴 전제

## 6) 런타임 어댑터

현재 AWS 환경이 ECS/EKS 기반이 아니라 EC2/ECR 혼재 상태이므로, 배포 런타임은 어댑터로 분기한다.

- `ec2`: SSM/SSH 기반 배포 명령
- `ecr`: 이미지 빌드/푸시 중심 플로우(추후 ECS로 확장 가능)
- `ecs`: 현재 미활성. 카탈로그에서 `runtime: ecs`로 표시된 항목만 별도 승인 후 활성화

## 7) 운영 체크포인트

- 변경 계획 생성: `scripts/deploy/compute-targets.py`
- 배포 승인 조건 검증: 환경별 승인자/브랜치 정책
- 배포 후 헬스체크와 감사로그 점검
- 실패 이벤트는 운영 로그와 감사 로그에 한 건씩 남기기
- EC2 배포 실행 시 필수 태그:
  - `CleverProject=clever-msa`
  - `CleverEnvironment=dev|stage|prod`
  - `CleverRole=app-host`
- `RUN` 타입: `scripts/deploy/runner.sh`는 카탈로그의 `instance_selector`를 사용해 EC2 대상을 동적으로 찾는다.

`SKIP_HEALTH_CHECK`가 `true`면 health-check를 수행하지 않고 바로 다음 단계로 진행한다.
- 기본은 `false`

## 8) 아티팩트 전략

- 현재 EC2 기본 경로는 `source SHA -> remote git checkout --detach -> docker compose up -d --build` 이다.
- 기본 태그 정책:
  - `registry`에는 SHA 기반 태그를 항상 생성한다.
  - `latest`는 운영 기본 태그로 사용하지 않는다.
  - 롤백은 `deploy --previous` 혹은 digest 롤백으로 수행하도록 문서/스크립트에서 유지한다.

## 9) 중앙 배포 레이어와 레포 구조의 관계

- 문서 경계(`docs/`)는 아키텍처/계약/운영 의사결정의 진실 근원.
- 코드/런타임 경계는 각 `development/<repo>`로 유지.
- 중앙 배포 레이어는 이 둘을 잇는 제어 플레인이며, 런타임 코드 경계는 바꾸지 않는다.

## 10) 새 EC2 기본값

- 기존 EC2 재활용보다 새 EC2 표준 호스트를 기본값으로 본다.
- 새 호스트 부트스트랩 기준은 [2026-04-07-ec2-host-bootstrap.md](2026-04-07-ec2-host-bootstrap.md) 문서를 따른다.
- 인스턴스 생성 자동화가 필요하면 `.github/workflows/provision-ec2-app-host.yml` 를 사용한다.
