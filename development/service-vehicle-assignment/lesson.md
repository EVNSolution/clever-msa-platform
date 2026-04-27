Source: https://lessons.md

# service-vehicle-assignment Lessons.md

This repo owns current driver-to-vehicle assignment truth. It should not absorb vehicle registry fields or telemetry status just to make one screen easier to build.

When closing this runtime, use a protected assignment read path under `/api/driver-vehicle-assignments/` instead of relying on `/health/` alone. That proves the assignment boundary that other services actually consume.
