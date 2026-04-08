# Ops-Derived Local Fixture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read a minimal, read-only slice of production-shaped operating data, sanitize it into reusable local fixtures, and inject it into the Docker local stack through service-owned management commands.

**Architecture:** Keep production access isolated to integration-local-stack scripts. Generate a single sanitized fixture bundle under integration-local-stack, then fan it into service-owned import commands for organization, drivers, vehicles, assignments, dispatch, delivery records, and settlements. Preserve service boundaries by letting each repo own its own persistence writes.

**Tech Stack:** Python scripts, Django management commands, Docker Compose, PostgreSQL/psql via Dev EC2 hop, JSON fixtures.

---

### Task 1: Define fixture contract and source extraction scope

**Files:**
- Create: `docs/decisions/specs/2026-04-06-ops-derived-local-fixture-design.md`
- Create: `development/integration-local-stack/fixtures/README.md`

- [ ] Write the fixture contract and sanitization rules.
- [ ] Define the minimal production queries to run read-only.
- [ ] Commit the design and fixture contract.

### Task 2: Add extraction and sanitization tooling in integration-local-stack

**Files:**
- Create: `development/integration-local-stack/scripts/extract_ops_seed_snapshot.py`
- Create: `development/integration-local-stack/fixtures/ops-derived-sample.json`
- Modify: `development/integration-local-stack/README.md`

- [ ] Write failing tests for extraction/sanitization helpers if they warrant unit coverage.
- [ ] Implement read-only extraction via Dev EC2 + psql.
- [ ] Implement deterministic anonymization and fixture writing.
- [ ] Verify script can generate fixture locally.
- [ ] Commit.

### Task 3: Add service-owned import commands

**Files:**
- Create: `development/service-organization-registry/organizations/management/commands/import_fixture_organization.py`
- Create: `development/service-driver-profile/drivers/management/commands/import_fixture_drivers.py`
- Create: `development/service-vehicle-registry/vehicles/management/commands/import_fixture_vehicles.py`
- Create: `development/service-vehicle-assignment/assignments/management/commands/import_fixture_assignments.py`
- Create: `development/service-dispatch-registry/dispatch/management/commands/import_fixture_dispatch.py`
- Create: `development/service-delivery-record/deliveryrecords/management/commands/import_fixture_delivery_records.py`
- Create: `development/service-settlement-payroll/settlements/management/commands/import_fixture_settlements.py`
- Add tests in each touched repo as needed.

- [ ] Write failing tests for the import path in the highest-risk services first.
- [ ] Implement idempotent import commands per service.
- [ ] Verify imports against the shared fixture contract.
- [ ] Commit.

### Task 4: Wire fixture import into local stack orchestration

**Files:**
- Modify: `development/integration-local-stack/infra/docker/seed-runner/run-seed.sh`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/integration-local-stack/README.md`

- [ ] Add opt-in fixture import mode after base migrate/seed.
- [ ] Document exact Docker/local commands.
- [ ] Verify seed-runner still works in default mode.
- [ ] Commit.

### Task 5: Validate end-to-end with Docker local stack

**Files:**
- Create: `development/integration-local-stack/scripts/verify_ops_fixture_stack.py`
- Create: `development/integration-local-stack/tests/test_verify_ops_fixture_stack.py`

- [ ] Add a smoke script that checks fixture-backed companies, drivers, vehicles, dispatch, and settlements through gateway routes.
- [ ] Run targeted service tests.
- [ ] Run Docker stack smoke with fixture import enabled.
- [ ] Commit.
