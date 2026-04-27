Source: https://lessons.md

# service-dispatch-operations-view Lessons.md

This slice stays stateless in the runtime. `service-dispatch-operations-view` should keep reading the write-side services through internal service contracts and should not grow its own database or cache dependency.

Smoke this service with honest read-model endpoints, not the prefix root. In production the trustworthy checks were:

- `/api/dispatch-ops/health/` -> `200`
- `/api/dispatch-ops/board/?dispatch_date=<date>&fleet_id=<fleet_id>` -> `200 []`
- `/api/dispatch-ops/summary/?dispatch_date=<date>&fleet_id=<fleet_id>` -> `200` zeroed payload

An empty board or zero summary is a valid success signal. For this repo, the failure to chase is a `500`, not an empty result.
