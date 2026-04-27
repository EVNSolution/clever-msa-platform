import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from rest_framework.exceptions import ValidationError


class OrganizationFleetLookupClient:
    def get_fleet_company_id(self, fleet_id: str, *, authorization: str = "") -> str:
        url = f"{settings.ORGANIZATION_MASTER_BASE_URL.rstrip('/')}/fleets/{fleet_id}/"
        headers = {"Accept": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        request = Request(url, headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 404:
                raise ValidationError({"fleet_ids": ["Fleet not found."]}) from exc
            raise ValidationError({"fleet_ids": ["Fleet lookup failed."]}) from exc
        except (URLError, json.JSONDecodeError) as exc:
            raise ValidationError({"fleet_ids": ["Fleet lookup failed."]}) from exc

        company_id = payload.get("company_id")
        if not company_id:
            raise ValidationError({"fleet_ids": ["Fleet company is missing."]})
        return str(company_id)
