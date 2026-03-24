# Driver Ops Runtime Naming Hard Cut Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `service-driver-operations-view`의 runtime naming을 `driver-360`에서 `driver-ops`로 hard cut하고, compose/gateway/front/living docs를 같은 naming set으로 맞춘다.

**Architecture:** repo 이름과 내부 Django app 이름은 유지하고, 외부 runtime 식별자만 role-aligned naming으로 정리한다. 즉 `service-driver-operations-view`는 계속 유지하되 runtime service는 `driver-ops-api`, gateway prefix는 `/api/driver-ops/`로 전환하고, front consumer와 living docs를 같은 배치에서 함께 이동시킨다.

**Tech Stack:** Django/DRF, Docker Compose, Nginx gateway, React/Vite, Vitest, Markdown

---

### Task 1: Front Driver API Client Hard Cut

**Files:**
- Create: `development/front-operator-console/src/api/driver360.test.ts`
- Modify: `development/front-operator-console/src/api/driver360.ts`

- [ ] **Step 1: Write the failing API client test for the new route**

Create `development/front-operator-console/src/api/driver360.test.ts` with:

```ts
import { describe, expect, it, vi } from 'vitest';

import { getDriver360 } from './driver360';

describe('getDriver360', () => {
  it('requests the driver ops route', async () => {
    const client = {
      request: vi.fn().mockResolvedValue({}),
    };

    await getDriver360(client, '10000000-0000-0000-0000-000000000001');

    expect(client.request).toHaveBeenCalledWith(
      '/driver-ops/drivers/10000000-0000-0000-0000-000000000001/',
    );
  });
});
```

Expected: front consumer contract is pinned to `/driver-ops/` before implementation.

- [ ] **Step 2: Run the front API test to verify it fails**

Run:
`cd development/front-operator-console && npm test -- src/api/driver360.test.ts`

Expected: FAIL because `driver360.ts` still calls `/driver-360/drivers/...`.

- [ ] **Step 3: Implement the minimal route change**

Modify `development/front-operator-console/src/api/driver360.ts`:

```ts
export function getDriver360(client: HttpClient, driverId: string) {
  return client.request<Driver360Summary>(`/driver-ops/drivers/${driverId}/`);
}
```

Expected: UI keeps the `Driver 360` feature name, but the runtime route changes to `driver-ops`.

- [ ] **Step 4: Re-run the focused front API test**

Run:
`cd development/front-operator-console && npm test -- src/api/driver360.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the front route change**

```bash
git add development/front-operator-console/src/api/driver360.ts \
        development/front-operator-console/src/api/driver360.test.ts
git commit -m "refactor: point driver front client at driver ops route"
```

### Task 2: Hard Cut Runtime Service And Gateway Naming

**Files:**
- Move: `development/integration-local-stack/infra/env/driver-360.env.example` -> `development/integration-local-stack/infra/env/driver-ops.env.example`
- Modify: `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- Modify: `development/edge-api-gateway/nginx.conf`
- Modify: `development/integration-local-stack/README.md`
- Modify: `development/integration-local-stack/compose/README.md`
- Modify: `development/service-driver-operations-view/README.md`

- [ ] **Step 1: Write the failing gateway-facing smoke commands into the task notes**

Use these commands as the red/green contract for this task:

```bash
curl -i http://localhost:8080/api/driver-ops/health/
curl -i http://localhost:8080/api/driver-360/health/
```

Expected before implementation:
- `/api/driver-ops/health/` is missing
- `/api/driver-360/health/` still resolves

This is the runtime contract the hard cut must reverse.

- [ ] **Step 2: Rename the env file and service references**

Apply the file move first:

```bash
git mv development/integration-local-stack/infra/env/driver-360.env.example \
       development/integration-local-stack/infra/env/driver-ops.env.example
```

Then modify `development/integration-local-stack/docker-compose.account-driver-settlement.yml`:

- service name `driver-360-api` -> `driver-ops-api`
- `depends_on` / `seed-runner` references -> `driver-ops-api`
- env file path -> `./infra/env/driver-ops.env.example`

Modify `development/integration-local-stack/infra/env/driver-ops.env.example`:

```env
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,driver-ops-api
```

Expected: compose/internal runtime naming is now role-aligned.

- [ ] **Step 3: Hard cut the gateway prefix**

Modify `development/edge-api-gateway/nginx.conf`:

```nginx
location /api/driver-ops/ {
    set $driver_ops_upstream driver-ops-api:8000;
    rewrite ^/api/driver-ops/(.*)$ /$1 break;
    proxy_pass http://$driver_ops_upstream;
    ...
}
```

Delete the old `/api/driver-360/` block entirely.

Expected: gateway exposes only the new prefix.

- [ ] **Step 4: Update repo-local runtime READMEs**

Modify:
- `development/integration-local-stack/README.md`
- `development/integration-local-stack/compose/README.md`
- `development/service-driver-operations-view/README.md`

Required content:
- service name is `driver-ops-api`
- external prefix is `/api/driver-ops/`
- `Driver 360` is still a feature/screen name, not runtime service naming

Expected: local docs no longer explain current runtime using `driver-360-api`.

- [ ] **Step 5: Run compose validation**

Run:
`docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml config`

Expected: PASS, with `driver-ops-api` present and no remaining `driver-360-api` service definition.

- [ ] **Step 6: Commit the runtime/gateway rename**

```bash
git add development/integration-local-stack/docker-compose.account-driver-settlement.yml \
        development/integration-local-stack/infra/env/driver-ops.env.example \
        development/edge-api-gateway/nginx.conf \
        development/integration-local-stack/README.md \
        development/integration-local-stack/compose/README.md \
        development/service-driver-operations-view/README.md
git commit -m "refactor: rename driver runtime to driver ops"
```

### Task 3: Update Living Docs Without Rewriting Historical Plans

**Files:**
- Modify: `docs/contracts/04-driver-360-read-model.md`
- Modify: `docs/rollout/13-account-driver-settlement-compose-simulation.md`

- [ ] **Step 1: Rewrite only the runtime naming notes in living docs**

In `docs/contracts/04-driver-360-read-model.md`, keep the contract name `Driver 360`, but add/adjust wording so that:

- runtime provider is `service-driver-operations-view`
- runtime service/container name is `driver-ops-api`
- gateway prefix is `/api/driver-ops/`
- `Driver 360` is a feature/read-model name, not the runtime service identifier

In `docs/rollout/13-account-driver-settlement-compose-simulation.md`, update:

- container list entry `driver-360-api` -> `driver-ops-api`
- gateway route `/api/driver-360/` -> `/api/driver-ops/`
- smoke expectations to use the new prefix

Expected: living docs match current runtime naming after the hard cut.

- [ ] **Step 2: Verify historical rollout plans are untouched**

Run:
`git diff --name-only`

Expected:
- only current living docs and runtime files are touched
- older historical rollout plan files that describe past implementation are unchanged

- [ ] **Step 3: Commit the living docs update**

```bash
git add docs/contracts/04-driver-360-read-model.md \
        docs/rollout/13-account-driver-settlement-compose-simulation.md
git commit -m "docs: align driver runtime naming with driver ops"
```

### Task 4: Prove The Hard Cut End To End

**Files:**
- Verify only: no new source files required

- [ ] **Step 1: Re-run the touched unit tests**

Run:
- `cd development/front-operator-console && npm test -- src/api/driver360.test.ts src/pages/Driver360Page.test.tsx`
- `cd development/service-driver-operations-view && python3.12 -m venv .venv312 && ./.venv312/bin/pip install -r requirements.txt && ./.venv312/bin/python manage.py test driver360.tests -v 2`

Expected: PASS. Front route client and backend driver summary runtime still work.

- [ ] **Step 2: Build the renamed runtime stack**

Run:
`docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml build driver-ops-api gateway front`

Expected: PASS with the new service name.

- [ ] **Step 3: Run the stack and seed bootstrap**

Run:
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml up -d driver-ops-api gateway front account-auth-api driver-profile-api organization-master-api settlement-payroll-api settlement-ops-api`
- `docker compose -f development/integration-local-stack/docker-compose.account-driver-settlement.yml run --rm seed-runner`

Expected: stack starts and seed-runner completes successfully after the service rename.

- [ ] **Step 4: Run gateway smoke for the new prefix**

Run:

```bash
ADMIN_TOKEN=$(curl -fsS http://localhost:8080/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"change-me"}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

curl -fsS http://localhost:8080/api/driver-ops/health/
curl -fsS http://localhost:8080/api/driver-ops/drivers/10000000-0000-0000-0000-000000000001/ \
  -H "Authorization: Bearer $ADMIN_TOKEN"
curl -i http://localhost:8080/api/driver-360/health/
```

Expected:
- `/api/driver-ops/health/` -> `200`
- `/api/driver-ops/drivers/<seeded-driver-id>/` -> `200`, same outer summary contract
- `/api/driver-360/health/` -> `404` or unmapped route

- [ ] **Step 5: Commit final verification if any smoke docs or helper outputs changed**

If no source files changed in this task, do not create an empty commit.

If verification required a small doc/runbook adjustment, commit only that diff:

```bash
git add <touched-files>
git commit -m "docs: finalize driver ops runtime cutover verification"
```
