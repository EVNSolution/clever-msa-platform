# AGENTS.md

## Must Know

- This repo owns edge routing only.
- It is the single local entrypoint for browser traffic and service API prefixes.
- Treat `../../docs/contracts/` and `../../docs/mappings/` as the source of truth for route intent and upstream ownership.

## What Belongs Here

- `nginx.conf`
- gateway Docker/runtime config
- route prefixes
- header forwarding and cookie forwarding behavior
- SPA fallback behavior for frontends

## What Must Not Be Added Here

- token issuance or account business logic
- service-specific business rules
- serializer or domain model code
- front application source
- service health logic beyond routing/proxy behavior

## Boundary Rules

- Gateway may forward auth headers and cookies, but it must not become the auth source of truth.
- Gateway may route to `*-operations-view` services, but it must not calculate read-model business state itself.
- If a route change implies a boundary change, update approved docs first, then update gateway config.
- Keep prefixes explicit. Do not hide service merges inside edge rewrites.

## Current Scope Notes

- Operator UI lives in `../front-operator-console/`.
- Admin UI lives in `../front-admin-console/`.
- Local integration compose lives in `../integration-local-stack/`.
