Source: https://lessons.md

# service-settlement-inquiry Lessons.md

## Keep Inquiry Write Independent From Side Effects

Settlement inquiry owns inquiry write truth only.

Snapshot preview enrichment and notification handoff are downstream concerns, so a successful driver or operator write must remain committed even when those side effects fail.

## Do Not Eager-Create Threads

Phase 1 treats one thread per driver as a workflow rule, not a bootstrap record.

`GET /api/settlement-inquiries/me/thread/` may return `null` and `GET /api/settlement-inquiries/me/messages/` may return `[]` until the first successful driver message creates the thread.

## Reopen The Thread On A New Driver Message

`answered` and `closed` are not terminal states in phase 1.

If the driver sends a new message after either state, the service reopens the thread to `open` instead of creating a second room.

## Keep Attachment Preview Read-Time Only

Writes store only the snapshot reference.

Preview payloads stay read-time fan-out from settlement ops and should degrade to `unavailable` instead of blocking inquiry reads or writes.

## Keep The Honest Smoke Read-Only

The honest smoke should stay `GET /api/settlement-inquiries/health/ -> 200` plus one protected route returning `401` without a token.

That proves startup and auth wiring without mutating a real inquiry thread.
