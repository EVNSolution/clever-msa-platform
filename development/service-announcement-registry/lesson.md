Source: https://lessons.md

# service-announcement-registry Lessons.md

This repo proves only the announcement registry boundary. A successful rollout here does not mean push delivery, inbox fan-out, or notification logging moved with it.

The honest production smoke is `/api/announcements/health/ -> 200` plus `/api/announcements/ -> 401` without a token. That is enough to prove gateway routing, service startup, and auth protection without mutating live announcement data.
