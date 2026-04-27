Source: https://lessons.md

# service-telemetry-hub Lessons.md

`/api/telemetry/` itself is not an honest smoke path for this repo. The production proof should use `/api/telemetry/health/ -> 200` and a protected read path such as `/api/telemetry/terminals/<uuid>/latest-location/ -> 401`.

Close this runtime on real endpoints, not on the prefix root. If health is `200` and the chosen read path is `401`, routing, auth, and backend reachability are all working even if `/api/telemetry/` returns `404`.
