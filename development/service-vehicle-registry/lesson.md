Source: https://lessons.md

# service-vehicle-registry Lessons.md

Vehicle registry truth is separate from assignment truth and telemetry state. Do not pull driver assignment or device status back into this service just because operators want one combined vehicle screen.

For rollout proof, prefer a protected read under `/api/vehicles/` over only `/health/`. That is the shortest route that proves registry reachability and auth together.
