import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings


class SourceClientError(Exception):
    """Base error for upstream source calls."""


class SourceNotFoundError(SourceClientError):
    """Raised when an upstream source returns 404."""


class SourceServiceError(SourceClientError):
    """Raised when an upstream source is unavailable or invalid."""


class SourceClients:
    def _build_url(self, base_url: str, path: str, query: dict | None = None) -> str:
        url = f"{base_url.rstrip('/')}{path}"
        if query:
            return f"{url}?{urlencode(query)}"
        return url

    def _request_json(
        self,
        *,
        url: str,
        authorization: str,
        allow_not_found: bool = False,
        expect_list: bool = False,
    ):
        headers = {"Accept": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        request = Request(url, headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 404 and allow_not_found:
                raise SourceNotFoundError(url) from exc
            raise SourceServiceError(f"Upstream request failed: {url}") from exc
        except (URLError, json.JSONDecodeError) as exc:
            raise SourceServiceError(f"Upstream request failed: {url}") from exc

        if expect_list and not isinstance(payload, list):
            raise SourceServiceError(f"Upstream request failed: {url}")
        return payload

    def get_vehicle(self, *, vehicle_id: str, authorization: str):
        return self._request_json(
            url=self._build_url(
                settings.VEHICLE_REGISTRY_BASE_URL,
                f"/vehicle-masters/{vehicle_id}/",
            ),
            authorization=authorization,
            allow_not_found=True,
        )

    def list_vehicle_operator_accesses(
        self,
        *,
        vehicle_id: str,
        access_status: str,
        authorization: str,
    ):
        return self._request_json(
            url=self._build_url(
                settings.VEHICLE_REGISTRY_BASE_URL,
                "/vehicle-operator-accesses/",
                query={
                    "vehicle_id": vehicle_id,
                    "access_status": access_status,
                },
            ),
            authorization=authorization,
            expect_list=True,
        )

    def get_driver(self, *, driver_id: str, authorization: str):
        return self._request_json(
            url=self._build_url(
                settings.DRIVER_PROFILE_BASE_URL,
                f"/{driver_id}/",
            ),
            authorization=authorization,
            allow_not_found=True,
        )
