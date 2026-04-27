Source: https://lessons.md

# service-account-access Lessons.md

## Own The Public Prefix

This service should not pretend its public admin lives at `/admin/` when the shared platform cannot safely expose that namespace. The cleaner shape is to let the service own `/admin/account-access/` directly and make every redirect agree with that decision.

## Treat Admin As A Full Surface

Exposing Django admin means more than adding `django.contrib.admin` to `INSTALLED_APPS`. The service must keep Django templates enabled, register its models in `accounts/admin.py`, define a real `STATIC_ROOT`, enable WhiteNoise, and run `collectstatic` before gunicorn starts. Otherwise the page may render in tests but fail in production after the first asset request.

## Keep Docs Local And Clear

The service-local docs endpoints are part of the contract now and should stay stable:

- `/openapi.yaml`
- `/swagger/`
- `/redoc/`

## Warnings Are Debt, Not A Rollback Trigger

`drf-spectacular` still emits warnings for custom JWT auth and some APIViews without explicit serializer metadata. Those warnings matter, but they are schema-cleanup work. They are not a reason to remove the working docs endpoints.

## Build Here, Roll Out From Runtime Release

This repo should publish `service-account-access:<sha>` and keep ownership of service-local docs and admin behavior. Production rollout ownership belongs to `runtime-prod-release`, and production runtime shape ownership belongs to `runtime-prod-platform`.
