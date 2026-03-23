import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from rest_framework.exceptions import APIException, ValidationError


class DriverLinkService:
    def link_account_to_driver(self, *, account_id: str, driver_id: str, authorization: str) -> None:
        request = Request(
            url=f"{settings.DRIVER_PROFILE_BASE_URL.rstrip('/')}/{driver_id}/",
            data=json.dumps({"account_id": account_id}).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": authorization,
            },
            method="PATCH",
        )
        try:
            with urlopen(request):
                return None
        except HTTPError as exc:
            if exc.code >= 500:
                raise APIException("Driver profile service is unavailable.") from exc
            details = self._read_error_details(exc)
            raise ValidationError(details) from exc
        except URLError as exc:
            raise APIException("Driver profile service is unavailable.") from exc

    def _read_error_details(self, exc: HTTPError):
        try:
            payload = json.loads(exc.read().decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            payload = {}

        details = payload.get("details")
        if isinstance(details, dict) and details:
            return details
        if exc.code == 404:
            return {"driver_id": ["Driver not found."]}
        return {"driver_id": ["Failed to link account to driver."]}
