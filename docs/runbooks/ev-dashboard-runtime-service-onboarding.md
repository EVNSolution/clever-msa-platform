# ev-dashboard Runtime Service Onboarding

이 문서는 current `ev-dashboard` production runtime에 새로운 image-backed backend service를 실제로 편입할 때 쓰는 operator runbook이다.

정본 우선순위는 항상 아래다.

1. live AWS/runtime state
2. [../rollout/current-deployment-source-of-truth.md](../rollout/current-deployment-source-of-truth.md)
3. `runtime-prod-platform` inventory
4. `runtime-prod-release` resolved plan and release evidence

## Scope

이 runbook은 아래 세 가지를 모두 닫는 first-introduction lane만 다룬다.

- workload catalog 등록
- prod host runtime enablement
- public edge/API exposure

즉 아래가 모두 완료되어야 onboarding 완료로 본다.

- `prod-runtime-inventory.json` 등록
- `service-manifest` + `service-secret-map` 반영
- runtime image map write-back
- actual running digest 일치
- public route와 docs surface 검증

## Stage 1: Pre-Prod Sufficient Conditions

실제 dispatch 전에 아래를 모두 고정한다.

1. workload catalog
- `development/runtime-prod-platform/release/prod-runtime-inventory.json`
- root [../mappings/current-runtime-inventory.md](../mappings/current-runtime-inventory.md)

2. host runtime config
- Secrets Manager `evdash/prod/runtime/entry/service-manifest`
- Secrets Manager `evdash/prod/runtime/entry/service-secret-map`
- 서비스가 dedicated PostgreSQL database를 쓰면 role/database를 먼저 만든다

3. deployable image proof
- service image digest
- companion `edge-api-gateway` digest
- 둘 다 prod host가 실제로 `docker pull` 가능한 `linux/amd64` digest여야 한다

4. edge route contract
- backend가 root-relative path를 받는 기존 서비스면 current pattern처럼 prefix rewrite를 쓴다
- backend가 이미 `/api/...` prefix를 app URL에 포함하면 prefix를 자르면 안 된다

5. release intent
- `runtime-prod-release/release/intents/...json`
- first introduction은 explicit immutable digest를 쓴다

## Mandatory Checks Before Dispatch

아래는 이번 rollout에서 실제 blocker였고, 앞으로도 먼저 봐야 한다.

1. host pull architecture
- prod host에서 candidate digest를 직접 `docker pull` 해 본다
- `no matching manifest for linux/amd64` 가 나오면 dispatch 금지
- service repo build가 local arm64 digest를 밀었을 수 있다

2. reconcile dry gate
- `assert-app-release-ready` 를 single-wave manifest로 먼저 확인한다
- 이 단계가 통과하면 manifest/secret shape는 대체로 맞다

3. service path shape
- public route가 front HTML로 떨어지면 edge location 자체가 없다
- public route가 backend 404로 떨어지면 edge가 prefix를 잘못 자르는지 먼저 본다

## Dispatch Sequence

1. resolve plan

```bash
cd development/runtime-prod-release
PYTHONPATH=. python release/resolve_release.py \
  release/intents/<intent>.json \
  --inventory-path ../runtime-prod-platform/release/prod-runtime-inventory.json \
  --platform-development-root ..
```

2. dispatch

```bash
PYTHONPATH=. python release/dispatch_ssm.py <resolved-plan.json> --mode dispatch
```

3. edge docs readback

```bash
PYTHONPATH=. python release/dispatch_ssm.py <resolved-plan.json> --mode edge-readback
```

4. post-release runtime state

```bash
PYTHONPATH=. python release/dispatch_ssm.py <resolved-plan.json> --mode post-release-state
```

5. release evidence

```bash
python release/evidence.py \
  <resolved-plan.json> \
  <dispatch-results.json> \
  <post-release-state.json> \
  --approver <actor> \
  --edge-api-docs-revision-path <edge-api-docs-revision.json> \
  --output-path <release-evidence.json>
```

## Minimum Success Proof

완료라고 부를 수 있는 최소 조건은 아래다.

1. runtime image map
- `/EvDashboardPlatformStack/runtime/images` 에 새 service digest가 들어갔다

2. actual running state
- `post-release-state.json` 에서 `resolved == runtime == actual`
- container name이 기대값으로 떠 있다

3. public route
- health endpoint `200`
- protected endpoint `401`

4. public docs
- `/openapi.yaml` 이 `200`
- 새 service path가 실제로 포함된다
- `edge-api-docs-revision.openapi_sha256` 와 served file bytes SHA256이 같아야 한다

## Known Failure Modes

### `docker pull` fails with `no matching manifest for linux/amd64`

원인:
- candidate digest가 arm64-only 또는 host architecture와 불일치

대응:
- service repo 또는 edge image를 `--platform linux/amd64` 로 다시 build/push
- host에서 같은 digest `docker pull` 로 재확인

### `assert-app-release-ready` passes but reconcile fails

원인:
- 대체로 image pull failure 또는 host-side bootstrap failure

대응:
- `systemctl status ev-dashboard-app-reconcile.service`
- `journalctl -u ev-dashboard-app-reconcile.service -n 200 --no-pager`
- runtime image map write-back 전이면 실제 반영은 안 된 상태다

### public API returns front HTML

원인:
- edge location block이 없음

대응:
- `edge-api-gateway` full profile config에 location 추가

### public API returns backend `404`

원인:
- edge가 prefix를 잘라서 backend app URL shape와 안 맞음

대응:
- backend URLConf가 이미 `/api/...` prefix를 포함하는지 확인
- 그런 서비스는 rewrite 없이 그대로 proxy 한다

## 2026-04-22 Settlement Inquiry Proof

`service-settlement-inquiry` first onboarding에서 실제로 확인한 값은 아래였다.

- service runtime enablement truth: `SETTLEMENT_INQUIRY` entry in `service-manifest`
- secret truth: `SETTLEMENT_INQUIRY__DJANGO_SECRET_KEY`, `SETTLEMENT_INQUIRY__POSTGRES_PASSWORD`, `SETTLEMENT_INQUIRY__JWT_SECRET_KEY`
- database bootstrap: PostgreSQL role/database `settlement_inquiry`
- service digest: `service-settlement-inquiry@sha256:380f28614fc27d8399bfd258d8764c0b9a7e3c742df032da5090cc793f5572aa`
- edge digest: `edge-api-gateway@sha256:35858d0f9e84fab0be3b869eaf3965c320370f8793920304c76d8eb52e444f0a`

public verification 결과는 아래였다.

- `https://api.ev-dashboard.com/api/settlement-inquiries/health/` -> `200`
- `https://api.ev-dashboard.com/api/settlement-inquiries/me/thread/` -> `401`
- `https://api.ev-dashboard.com/openapi.yaml` -> `200` and includes `/api/settlement-inquiries/...`
