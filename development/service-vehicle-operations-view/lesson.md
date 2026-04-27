Source: https://lessons.md

# service-vehicle-operations-view Lessons.md

`telemetry` and `terminal-registry` enrichments are optional, not hard dependencies. If those lookups fail, the main vehicle summary path should stay healthy and degrade enrichment fields instead of failing the whole response.

Because of that boundary, `SourceServiceError` from telemetry or terminal lookups must degrade to warnings or null enrichment fields instead of failing the whole response.

Use these honest production checks:

- `/api/vehicle-ops/health/` -> `200`
- `/api/vehicle-ops/vehicles/` -> `200 []`
- `/api/vehicle-ops/vehicles/<unknown-vehicle-ref>/` -> `404 not_found`

If this repo returns `500` because an optional bridge failed, treat it as a contract bug.
