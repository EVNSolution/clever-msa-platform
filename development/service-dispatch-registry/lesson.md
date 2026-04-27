Source: https://lessons.md

# service-dispatch-registry Lessons.md

This repo owns planning truth, not current assignment truth. Keep plan rows, vehicle schedules, and plan assignments here, and leave live assignment state to `service-vehicle-assignment`.

The honest proof is a plan read path under `/api/dispatch/`, such as `/api/dispatch/plans/`, not only `/health/`. That path exercises the part of the runtime that downstream slices actually read.
