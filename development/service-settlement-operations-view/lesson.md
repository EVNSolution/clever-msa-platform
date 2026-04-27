Source: https://lessons.md

# service-settlement-operations-view Lessons.md

Ops is the read-only settlement fan-out. It should come up only after payroll is already reachable, because its primary read path depends on `settlement-payroll-api` plus enrichment from delivery and driver sources.

The honest production smoke for this repo was:

- `/api/settlement-ops/health/` -> `200`
- `/api/settlement-ops/runs/` -> `401` without token

That is enough to prove the read-model route and auth layer. Do not use this repo to prove settlement write ownership or production payout mutation.

## Enrich Payroll Truth, Do Not Recalculate It

The new driver daily settlement surface only stayed boundary-safe after `service-settlement-operations-view` was reduced to two jobs:

- read day-level amount truth from `service-settlement-payroll`
- enrich each row with `daily_delivery_input_snapshot_id` from `service-delivery-record`

Do not re-derive `unit_price`, `total_amount`, or `settlement_type` here. If the snapshot reference is unavailable in v1, fail with the existing dependency error instead of returning a partial amount payload.
