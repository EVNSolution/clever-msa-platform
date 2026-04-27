Source: https://lessons.md

# service-driver-operations-view Lessons.md

Upstream `404` from the driver source must stay a `404` at the public edge. Slice 4 surfaced a real bug where `SourceNotFoundError` was referenced but not imported, so an honest "driver not found" case became a `500 Unexpected server error`.

Keep unknown driver smoke honest:

- `/api/driver-ops/health/` -> `200`
- `/api/driver-ops/drivers/<unknown-driver-ref>/` -> `404 not_found`

Do not weaken this into a broad `except` that hides source errors. The correct contract is specific: missing core driver data is `404`, not `500`.

## `needs_link` Belongs At The `me` Facade

For the driver app settlement calendar, `service-driver-operations-view` should own only session resolution and facade behavior:

- resolve the active `driver_account_link`
- return `needs_link` when the account is not linked
- forward the linked case to `service-settlement-operations-view`

Do not move settlement amount logic into this repo. `needs_link` is a user-session concern, not a settlement truth concern.
