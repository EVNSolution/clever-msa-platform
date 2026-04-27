import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from rest_framework.exceptions import NotFound, ValidationError


class OrganizationTenantLookupClient:
    def resolve_tenant(self, tenant_code: str) -> dict:
        query = urlencode({"tenant_code": tenant_code})
        url = f"{settings.ORGANIZATION_MASTER_BASE_URL.rstrip('/')}/companies/public/resolve/?{query}"
        request = Request(url, headers={"Accept": "application/json"})

        try:
            with urlopen(request, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 404:
                raise NotFound("Requested company cockpit was not found.") from exc
            raise ValidationError({"tenant_code": ["Tenant lookup failed."]}) from exc
        except (URLError, json.JSONDecodeError) as exc:
            raise ValidationError({"tenant_code": ["Tenant lookup failed."]}) from exc

        if not payload.get("company_id"):
            raise ValidationError({"tenant_code": ["Tenant company is missing."]})
        return payload
