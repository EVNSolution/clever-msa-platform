# 중앙 배포 레이어 전환 체크리스트

## 1. 준비 단계

- [ ] 중앙 배포 문서 체계 정리 완료
  - [x] `2026-04-07-central-deploy-reference.md`
  - [x] `2026-04-07-aws-oidc-actions-setup.md`
  - [x] `docs/mappings/central-deploy-catalog.yaml`
- [ ] 실행 규칙 정합성 확인
  - 대상은 `service-*`, `front-*`, `edge-api-gateway`로 제한
  - 문서 전용 변경은 배포 skip 정책 적용
- [ ] 권한 분리 테스트(예비)
  - DEV/Stage/Prod 역할 ARN 기록
  - OIDC Trust 정책 경로 제한 검증
- [ ] GitHub repository 설정 완료
  - remote 연결
  - `dev` / `stage` / `prod` environments 생성
  - deploy / infra secrets 등록
- [ ] 새 EC2 호스트 준비
  - `CleverProject=clever-msa`
  - `CleverEnvironment=<env>`
  - `CleverRole=app-host`
  - SSM managed instance online 상태 확인
  - 필요 시 `.github/workflows/provision-ec2-app-host.yml`로 생성

## 2. 파일 변경 감지 및 타겟 계산

- [ ] `scripts/deploy/compute-targets.py` 실행 검증
  - development 변경에서 service 추출
  - docs-only 변경에서 배포 스킵 검증
  - wave 순서와 의존성 순서 검증
- [ ] 타겟 산출물 형식 검증
  - `wave`, `services`, `runtime`, `depends_on`, `deploy_order` 필드 존재
- [ ] CI에서 기본 실행 예시
  - `main` push 1건 + 변경 파일 시뮬레이션

## 3. Stage 파일럿

- [ ] `dev` 대상 1개 서비스 dry-run
  - 예: `service-delivery-record` 또는 `service-settlement-registry`
  - host는 새 EC2 태그 셀렉터로 발견되어야 함
- [ ] `dev` 3회 연속 통과
- [ ] `stage`에서 수동 승인 시나리오 1건 통과
- [ ] 운영 승인 정책과 알림 채널 점검
  - 승인자/취소자 로그 보존
  - 실패 사유 메시지 템플릿 점검

## 4. 롤백/복구 시나리오

- [ ] 변경 대상 1개 배포 실패 후 해당 wave만 재시도 가능
- [ ] 의존없는 2개 wave 동시 실패 시 차단 및 원인 분리
- [ ] prod 승인 거부 시 자동 대기/후속 조치 정상 동작
- [ ] 기존 배포 경로(수동/기존 운영 스크립트)와 충돌 없음 확인

## 5. 운영 전환

- [ ] 1차 운영 배포(부분 서비스) 승인
- [ ] 단계별 운영 체크 완료 후 점진 확대
  - 핵심 서비스군부터 확장
  - read-model/부가 서비스는 안정성 확보 후 확장
- [ ] 중앙 배포 실행 로그 보존 정책 적용
  - 감사 로그, 배포 이유, 롤백 기준 및 근거 보존
