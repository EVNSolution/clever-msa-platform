import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class SourceClientError(Exception):
    """Base error for upstream source calls."""


class SourceNotFoundError(SourceClientError):
    """Raised when an upstream source returns 404."""


class SourceServiceError(SourceClientError):
    """Raised when an upstream source is unavailable or invalid."""


class VehicleRegistryClient:
    def get_vehicle(self, *, vehicle_id: str, authorization: str):
        url = f"{settings.VEHICLE_REGISTRY_BASE_URL.rstrip('/')}/vehicle-masters/{vehicle_id}/"
        headers = {"Accept": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        request = Request(url, headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 404:
                raise SourceNotFoundError(url) from exc
            raise SourceServiceError(f"Upstream request failed: {url}") from exc
        except (URLError, json.JSONDecodeError) as exc:
            raise SourceServiceError(f"Upstream request failed: {url}") from exc
