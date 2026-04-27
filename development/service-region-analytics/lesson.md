Source: https://lessons.md

# service-region-analytics Lessons.md

Region analytics is an admin-facing analytics surface, not the region master itself. A successful rollout here should not be described as “region truth moved” unless `service-region-registry` was proven separately.

The honest production smoke is `/api/region-analytics/health/ -> 200` plus `/api/region-analytics/daily-statistics/ -> 401` without a token. That proves route, service startup, and auth protection without mutating analytics rows in production.
