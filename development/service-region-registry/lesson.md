Source: https://lessons.md

# service-region-registry Lessons.md

Region registry is the write truth for region master data only. Analytics, route recommendations, and richer operational views belong in separate read or recommendation surfaces.

The honest external proof is `/api/regions/health/ -> 200` plus a protected read under `/api/regions/`. That keeps rollout language focused on registry truth instead of claiming the whole region domain moved with one service.
