Source: https://lessons.md

# service-telemetry-dead-letter Lessons.md

The honest external proof for this repo is `/api/telemetry-dead-letters/health/ -> 200` plus `/api/telemetry-dead-letters/ -> 401` without a token. That is enough to prove the admin/read surface without forcing a production write-path test.

Treat this service as the failed-telemetry admin surface. The MQTT listener cutover is a separate internal-worker concern and should not block dead-letter closure.
