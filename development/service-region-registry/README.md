# service-region-registry

이 repo는 권역 기준 정본 runtime이다.

현재 역할:
- `Region` CRUD
- 권역 polygon GeoJSON, 난이도, 활성 상태 관리
- admin-only management API와 `health` endpoint
- deterministic bootstrap seed command

이 repo는 절대 소유하지 않음:
- 권역별 배송 통계
- 권역 성과 분석
- route recommendation logic
- 배송지 팁, 제한 구역, 추천 주차, 입구/출구

현재 API:
- internal path: `/health/`
- internal path: `/`
- internal path: `/<region_id>/`
- gateway prefix: `/api/regions/`

아직 포함하지 않음:
- company/fleet 기준 권역 할당
- region hierarchy
- analytics projection
- route knowledge merge

현재 정본:
- `../../docs/mappings/`
- `../../docs/decisions/specs/2026-03-26-region-registry-phase-1-activation-design.md`
