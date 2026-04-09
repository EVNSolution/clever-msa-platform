# 2026-04-09 Development Linked Child Repos Inventory

## Purpose

This inventory records how each first-level repo under `development/` is currently represented from the root `clever-msa-platform` workspace.

It is the Phase 1 inventory artifact for:

- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-09-development-linked-child-repos-governance-design.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-09-development-linked-child-repos-migration-plan.md`

## Summary

- total first-level repos under `development/`: 26
- current `linked_child_repo`: 1
- current `tracked_snapshot`: 25
- current mixed state risk: high

## Column Note

`Migration friction` means workspace conversion friction, not runtime failure risk.

It estimates how disruptive the `tracked_snapshot -> linked_child_repo` conversion may be for local contributor habits, GitHub browsing patterns, and workspace maintenance.

## Inventory

| Repo | Current representation | Origin remote | Root-visible commit | Migration friction | Proposed batch |
|---|---|---|---|---|---|
| `development/front-web-console` | `linked_child_repo` | `https://github.com/EVNSolution/front-web-console` | `f38704c` | high | already linked / reference pattern |
| `development/edge-api-gateway` | `tracked_snapshot` | `https://github.com/EVNSolution/edge-api-gateway` | `9564fe8` | high | batch 4 - core runtime |
| `development/integration-local-stack` | `tracked_snapshot` | `https://github.com/EVNSolution/integration-local-stack` | `9847120` | high | batch 5 - orchestration |
| `development/service-account-access` | `tracked_snapshot` | `https://github.com/EVNSolution/service-account-access` | `b0612cc` | high | batch 4 - core runtime |
| `development/service-announcement-registry` | `tracked_snapshot` | `https://github.com/EVNSolution/service-announcement-registry` | `2ebb324` | low | batch 1 - low risk services |
| `development/service-delivery-record` | `tracked_snapshot` | `https://github.com/EVNSolution/service-delivery-record` | `5eb58e0` | high | batch 4 - settlement/delivery |
| `development/service-dispatch-operations-view` | `tracked_snapshot` | `https://github.com/EVNSolution/service-dispatch-operations-view` | `16b5637` | high | batch 4 - core runtime |
| `development/service-dispatch-registry` | `tracked_snapshot` | `https://github.com/EVNSolution/service-dispatch-registry` | `d55ff66` | high | batch 4 - core runtime |
| `development/service-driver-operations-view` | `tracked_snapshot` | `https://github.com/EVNSolution/service-driver-operations-view` | `7422127` | medium | batch 3 - operator/read services |
| `development/service-driver-profile` | `tracked_snapshot` | `https://github.com/EVNSolution/service-driver-profile` | `772ea15` | medium | batch 2 - medium risk services |
| `development/service-notification-hub` | `tracked_snapshot` | `https://github.com/EVNSolution/service-notification-hub` | `f870689` | low | batch 1 - low risk services |
| `development/service-organization-registry` | `tracked_snapshot` | `https://github.com/EVNSolution/service-organization-registry` | `d0500d3` | medium | batch 2 - medium risk services |
| `development/service-personnel-document-registry` | `tracked_snapshot` | `https://github.com/EVNSolution/service-personnel-document-registry` | `c8a407e` | low | batch 1 - low risk services |
| `development/service-region-analytics` | `tracked_snapshot` | `https://github.com/EVNSolution/service-region-analytics` | `606972e` | low | batch 1 - low risk services |
| `development/service-region-registry` | `tracked_snapshot` | `https://github.com/EVNSolution/service-region-registry` | `571c7aa` | low | batch 1 - low risk services |
| `development/service-settlement-operations-view` | `tracked_snapshot` | `https://github.com/EVNSolution/service-settlement-operations-view` | `19f3f20` | high | batch 4 - settlement/delivery |
| `development/service-settlement-payroll` | `tracked_snapshot` | `https://github.com/EVNSolution/service-settlement-payroll` | `1743922` | medium | batch 2 - medium risk services |
| `development/service-settlement-registry` | `tracked_snapshot` | `https://github.com/EVNSolution/service-settlement-registry` | `f1fe90b` | high | batch 4 - settlement/delivery |
| `development/service-support-registry` | `tracked_snapshot` | `https://github.com/EVNSolution/service-support-registry` | `8722a1a` | low | batch 1 - low risk services |
| `development/service-telemetry-dead-letter` | `tracked_snapshot` | `https://github.com/EVNSolution/service-telemetry-dead-letter` | `b4cd887` | low | batch 1 - low risk services |
| `development/service-telemetry-hub` | `tracked_snapshot` | `https://github.com/EVNSolution/service-telemetry-hub` | `8871de3` | medium | batch 2 - medium risk services |
| `development/service-telemetry-listener` | `tracked_snapshot` | `https://github.com/EVNSolution/service-telemetry-listener` | `014461c` | medium | batch 2 - medium risk services |
| `development/service-terminal-registry` | `tracked_snapshot` | `https://github.com/EVNSolution/service-terminal-registry` | `2bdd9c0` | medium | batch 2 - medium risk services |
| `development/service-vehicle-assignment` | `tracked_snapshot` | `https://github.com/EVNSolution/service-vehicle-assignment` | `bc65116` | medium | batch 2 - medium risk services |
| `development/service-vehicle-operations-view` | `tracked_snapshot` | `https://github.com/EVNSolution/service-vehicle-operations-view` | `9855062` | medium | batch 3 - operator/read services |
| `development/service-vehicle-registry` | `tracked_snapshot` | `https://github.com/EVNSolution/service-vehicle-registry` | `7750d2b` | high | batch 4 - core runtime |

## Batch Intent

### Batch 1 - Low friction services

Start with low-change supporting repos where ownership is already obvious and rollout impact is limited.

- `service-announcement-registry`
- `service-notification-hub`
- `service-personnel-document-registry`
- `service-region-analytics`
- `service-region-registry`
- `service-support-registry`
- `service-telemetry-dead-letter`

### Batch 2 - Medium friction services

Convert medium-risk services next after the conversion procedure is proven.

- `service-driver-profile`
- `service-organization-registry`
- `service-settlement-payroll`
- `service-telemetry-hub`
- `service-telemetry-listener`
- `service-terminal-registry`
- `service-vehicle-assignment`

### Batch 3 - Operator and read services

Convert operator-facing read services once the linked child repo procedure is stable.

- `service-driver-operations-view`
- `service-vehicle-operations-view`

### Batch 4 - Core runtime and settlement/delivery services

Leave policy-critical and workflow-heavy services until the procedure is proven on lower-risk batches.

- `edge-api-gateway`
- `service-account-access`
- `service-delivery-record`
- `service-dispatch-operations-view`
- `service-dispatch-registry`
- `service-settlement-operations-view`
- `service-settlement-registry`
- `service-vehicle-registry`

### Batch 5 - Orchestration

Convert orchestration last.

- `integration-local-stack`

## Immediate Follow-up

1. standardize one conversion checklist for `tracked_snapshot -> linked_child_repo`
2. execute batch 1 first
3. keep `development/front-web-console` as the reference example while the rest migrate
