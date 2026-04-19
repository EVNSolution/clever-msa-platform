# Service Doc Alignment Checklist

이 문서는 active `service-*` repo 문서 정합성 감사 ledger다.

Canonical truth:

- [WORKSPACE.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/service-docs-runtime-alignment/WORKSPACE.md)
- [repo-map.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/service-docs-runtime-alignment/repo-map.md)
- [current-runtime-inventory.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/service-docs-runtime-alignment/docs/mappings/current-runtime-inventory.md)
- relevant boundary docs under [docs/boundaries](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/service-docs-runtime-alignment/docs/boundaries)
- relevant contract docs under [docs/contracts](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/service-docs-runtime-alignment/docs/contracts)
- runtime reset docs:
  - [2026-04-19-prod-runtime-release-reset-design.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/service-docs-runtime-alignment/docs/superpowers/specs/2026-04-19-prod-runtime-release-reset-design.md)
  - [2026-04-19-prod-runtime-release-reset-implementation-plan.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/.worktrees/service-docs-runtime-alignment/docs/superpowers/plans/2026-04-19-prod-runtime-release-reset-implementation-plan.md)

## Drift Categories

Each service repo is reviewed against these categories.

- `boundary`
  - README purpose/boundary disagrees with repo-map or boundary docs
- `runtime`
  - README or lesson still describes outdated runtime layer, host layout, or route truth
- `deploy`
  - README or lesson still treats the service repo as prod rollout owner
- `stale-topology`
  - README or lesson still treats old ECS/Fargate/Service Connect/central deploy/bridge lane as current truth when it is not
- `verification`
  - local verification wording no longer matches the honest runtime surface
- `historical-reference`
  - old notes exist but are written like current truth instead of clearly bounded history

## Status Ledger

Legend:

- `pending`
- `aligned`
- `intentional-history`
- `needs-update`

### service-account-access

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: lesson deploy owner updated from old infra wording to `runtime-prod-release` + `runtime-prod-platform`

### service-announcement-registry

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched announcement-only boundary

### service-attendance-registry

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: lesson kept container-entrypoint warning but removed old ECS-specific framing

### service-delivery-record

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: lesson kept Dockerfile warning but normalized wording to current runtime truth

### service-dispatch-operations-view

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: lesson no longer presents ECS/Service Connect as current truth

### service-dispatch-registry

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched current planning-truth boundary

### service-driver-operations-view

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched read-only driver-ops boundary

### service-driver-profile

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched driver profile truth boundary

### service-notification-hub

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched inbox/log boundary without overstating provider cutover

### service-organization-registry

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched current org-truth and prod deploy ownership

### service-personnel-document-registry

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: metadata-only boundary already clear in both docs

### service-region-analytics

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: analytics-only boundary and read-only smoke wording already matched root truth

### service-region-registry

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: registry-only boundary and protected-read smoke already matched root truth

### service-settlement-operations-view

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched read-only settlement-ops boundary

### service-settlement-payroll

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: lesson kept upstream dependency lesson but removed ECS-specific framing

### service-settlement-registry

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched registry-only settlement boundary

### service-support-registry

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched support truth plus best-effort notification handoff wording

### service-telemetry-dead-letter

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: lesson removed old slice framing and kept failed-telemetry admin-surface truth

### service-telemetry-hub

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: lesson kept honest probe guidance and removed old slice framing

### service-telemetry-listener

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson now describe current internal-only worker truth without ECS/CloudWatch framing

### service-terminal-registry

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: lesson kept honest protected smoke but removed old hostname/slice framing

### service-vehicle-assignment

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched current assignment-truth boundary

### service-vehicle-operations-view

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: lesson now treats telemetry/terminal enrichment as optional runtime dependency, not old bridge truth

### service-vehicle-registry

- boundary: `aligned`
- runtime: `aligned`
- deploy: `aligned`
- verification: `aligned`
- historical-reference: `aligned`
- notes: README and lesson already matched vehicle registry truth boundary
