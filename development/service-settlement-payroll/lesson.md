Source: https://lessons.md

# service-settlement-payroll Lessons.md

Payroll is the settlement write owner and its runtime contract is wider than a normal single-DB Django service. The runtime only became honest after these upstream dependencies were wired together:

- `organization-master-api`
- `driver-profile-api`
- `settlement-registry-api`
- `delivery-record-api`
- `dispatch-registry-api`
- `attendance-registry-api`

The honest production smoke for this repo was:

- `/api/settlements/health/` -> `200`
- `/api/settlements/runs/` -> `401` without token

That response shape proves the service is reachable and protected, without creating a real production settlement run.

## Daily Read Truth Must Reuse Payroll Math

When the driver app needed day-level settlement reads, the safe move was not to let a downstream read model invent a second calculator. Payroll now exposes an upstream-only daily settlement source that reuses the same amount derivation path as run generation. Keep `unit_price` and `total_amount` truth in this repo, and treat every downstream consumer as a reader only.
