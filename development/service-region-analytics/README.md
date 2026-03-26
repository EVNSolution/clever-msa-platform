# service-region-analytics

이 repo는 권역 분석 runtime이다.

현재 역할:
- `RegionDailyStatistic` CRUD
- `RegionPerformanceSummary` CRUD
- admin-only analytics management API와 `health` endpoint
- deterministic bootstrap seed command

이 repo는 절대 소유하지 않음:
- 권역 기준 마스터 쓰기
- dispatch planning truth 쓰기
- delivery source truth 쓰기
- route recommendation
- 지도 / 추천 기능

현재 API:
- internal path: `/health/`
- internal path: `/daily-statistics/`
- internal path: `/daily-statistics/<region_daily_statistic_id>/`
- internal path: `/performance-summaries/`
- internal path: `/performance-summaries/<region_performance_summary_id>/`
- gateway prefix: `/api/region-analytics/`

아직 포함하지 않음:
- region-registry fan-out validation
- dispatch / delivery 기반 자동 집계
- 권역 비교 ranking endpoint
- 지도 / 추천 기능 연계

현재 정본:
- `../../docs/mappings/`
- `../../docs/decisions/specs/2026-03-27-region-analytics-phase-1-activation-design.md`
