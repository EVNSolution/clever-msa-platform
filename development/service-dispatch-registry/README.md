# service-dispatch-registry

배차 계획 정본을 소유하는 Django/DRF runtime repo다.

현재 역할:
- `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment` 1차 계획 truth
- `fleet + dispatch_date` 물량 계획
- `vehicle + dispatch_date + shift_slot` 차량 슬롯 계획
- `vehicle + driver + dispatch_date + shift_slot` 계획 배정

미래 역할:
- 배차 기준 정본 확장
- 이후 `service-dispatch-operations-view`가 읽는 계획 source
- 권역, 가용성, 예외 입력은 후속 단계에서 연결

상태:
- runtime 구현 완료
- 로컬 통합 스택 편입 대상

소유 테이블:
- `dispatch_plan`
- `vehicle_schedule`
- `dispatch_assignment`

소유하지 않는 것:
- current runtime assignment truth
- 권역 / 목적지
- leave / 휴무 / 월 근무일수
- terminal / telemetry 상태

핵심 경계:
- `service-dispatch-registry`는 계획 truth다
- `service-vehicle-assignment`는 current assignment truth다
- `operator_company_id`는 FK가 아닌 dispatch-context snapshot 컬럼이다

정본 문서:
- 플랫폼 아키텍처 정본은 `../../docs/` 아래 문서를 따른다.

로컬 실행:
- `../../development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- gateway route: `/api/dispatch/`
