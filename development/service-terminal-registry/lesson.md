Source: https://lessons.md

# service-terminal-registry Lessons.md

The honest external proof for this service is `/api/terminals/health/ -> 200` plus `/api/terminals/ -> 401` without a token. The list path is protected, so `401` proves gateway routing, auth middleware, and service reachability at the same time.

This repo can be verified independently of `service-telemetry-listener`. Terminal/admin surface proof should not wait on the internal MQTT worker.
