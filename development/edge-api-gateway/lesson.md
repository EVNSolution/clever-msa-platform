Source: https://lessons.md

# edge-api-gateway Lessons.md

## Declare Special Routes Before The Catch-All

The shared gateway still belongs to the front app at `/`, so docs and admin paths must be declared earlier and more explicitly. Exact matches and `^~` prefixes are what keep the front proxy from swallowing a backend control surface.

## Do Not Hide Django Admin

The gateway should not pretend a Django admin prefix is something else internally. Rewriting `/admin/account-access/` back to `/admin/` looks convenient, but it breaks Django's own redirects and the next request after login. Forward the service-owned path as-is.

## Static Is Part Of The Contract

If the gateway publishes a Django admin, it must publish the related admin static assets too. Treat `/static/admin/` as part of the same feature, not as an afterthought.

## Current Account Access Mapping

- `/openapi.yaml` -> `/openapi.yaml`
- `/swagger/` -> `/swagger/`
- `/redoc/` -> `/redoc/`
- `/admin/account-access/` -> `/admin/account-access/`
- `/static/admin/` -> `/static/admin/`

## Build Here, Deploy From Infra

This repo should publish `edge-api-gateway:<sha>` and stop there. Shared ALB, ACM, Route53, and ECS deploy ownership belongs to `infra-ev-dashboard-platform`, not to the gateway repo.

## ECS Resolver Rules Differ From Docker Compose

`resolver 127.0.0.11` is a Docker-local assumption. On ECS/Fargate it caused `recv() failed (111: Connection refused)` during upstream resolution. If nginx still needs a resolver in this stack, use the AWS VPC resolver address instead of the Docker one.

## Core Service Connect Routes Should Be Direct

For `account-auth-api` and `web-console`, variable-based `proxy_pass` kept sending nginx through request-time DNS behavior that did not match the intended Service Connect path. The stable ECS form for the core routes is direct upstreams:

- `proxy_pass http://account-auth-api:8000;`
- `proxy_pass http://web-console:5174;`
- `proxy_pass http://organization-master-api:8000;`

That change turned the public auth/docs/admin endpoints from `502` into working responses.

## Variable Proxy Pass Failed For The Organization Slice

`organization-master-api` and `organization-http.ev-dashboard.internal` both failed behind `proxy_pass http://$organization_master_upstream;` even after the backend task was healthy. The stable fix was not a different hostname. It was returning to a direct upstream and letting infra order the rollout so the name existed before nginx started.

## New Direct Upstreams Can Need A Second Gateway Roll

Slice 5 proved that direct upstreams are still the right contract for stable Service Connect routes, but there is an extra timing rule when the upstream name did not exist before the deploy started. The first gateway task for the settlement slice came up while the new settlement services were still being created, and nginx kept logging:

- `settlement-registry-api could not be resolved`
- `settlement-payroll-api could not be resolved`
- `settlement-ops-api could not be resolved`

The routes only stabilized after CloudFormation reached the late `EdgeApiGatewayService UPDATE_IN_PROGRESS` phase and the new gateway task restarted with the settlement services already present. When a brand-new route stays `502` after the backend task exists, check whether the current gateway task started too early before rewriting anything again.

## Support Surface Follows The Same Direct-Upstream Rule

Slice 6 used the same stable pattern for the support routes:

- `region-registry-api`
- `region-analytics-api`
- `announcement-registry-api`
- `support-registry-api`
- `notification-hub-api`

During the mixed gateway rollout, some of those routes answered `200` while others still answered `502`. The fix was not another nginx rewrite. It was waiting for the gateway replacement to finish so every route was served by the task that already knew all five upstreams.
