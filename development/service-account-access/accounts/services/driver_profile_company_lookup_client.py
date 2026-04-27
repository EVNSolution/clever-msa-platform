import json
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from django.conf import settings
from rest_framework.exceptions import ValidationError


class DriverProfileCompanyLookupClient:
    def get_driver_company_id(self, driver_id: str) -> str:
        url = f"{settings.DRIVER_PROFILE_BASE_URL.rstrip('/')}/{driver_id}/"
        try:
            with urlopen(url, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 404:
                raise ValidationError({"driver_id": ["Driver not found."]}) from exc
            raise ValidationError({"driver_id": ["Driver lookup failed."]}) from exc
        except (URLError, json.JSONDecodeError) as exc:
            raise ValidationError({"driver_id": ["Driver lookup failed."]}) from exc

        company_id = payload.get("company_id")
        if not company_id:
            raise ValidationError({"driver_id": ["Driver company is missing."]})
        return str(company_id)
