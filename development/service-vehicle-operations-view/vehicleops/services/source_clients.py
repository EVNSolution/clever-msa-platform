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


class SourceClients:
    def _build_url(self, base_url: str, path: str) -> str:
        return f"{base_url.rstrip('/')}{path}"

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

        if expect_list and isinstance(payload, dict):
            if any(key in payload for key in ("count", "next", "previous", "results")):
                raise SourceServiceError(f"Upstream request failed: {url}")
            raise SourceServiceError(f"Upstream request failed: {url}")

        return payload

    def get_vehicle(self, *, vehicle_id: str, authorization: str):
        return self._request_json(
            url=self._build_url(settings.VEHICLE_ASSET_BASE_URL, f"/vehicle-masters/{vehicle_id}/"),
            authorization=authorization,
            allow_not_found=True,
        )

    def list_vehicles(self, *, authorization: str):
        return self._request_json(
            url=self._build_url(settings.VEHICLE_ASSET_BASE_URL, "/vehicle-masters/"),
            authorization=authorization,
            expect_list=True,
        )

    def list_active_operator_accesses(self, *, authorization: str):
        return self._request_json(
            url=self._build_url(
                settings.VEHICLE_ASSET_BASE_URL,
                "/vehicle-operator-accesses/?access_status=active",
            ),
            authorization=authorization,
            expect_list=True,
        )

    def list_companies(self, *, authorization: str):
        return self._request_json(
            url=self._build_url(settings.ORGANIZATION_MASTER_BASE_URL, "/companies/"),
            authorization=authorization,
            expect_list=True,
        )

    def list_assigned_assignments(self, *, authorization: str):
        return self._request_json(
            url=self._build_url(
                settings.DRIVER_VEHICLE_ASSIGNMENT_BASE_URL,
                "/assignments/?assignment_status=assigned",
            ),
            authorization=authorization,
            expect_list=True,
        )

    def get_latest_vehicle_location(self, *, vehicle_id: str, authorization: str):
        try:
            return self._request_json(
                url=self._build_url(
                    settings.TELEMETRY_HUB_BASE_URL,
                    f"/vehicles/{vehicle_id}/latest-location/",
                ),
                authorization=authorization,
                allow_not_found=True,
            )
        except SourceNotFoundError:
            return None

    def list_latest_vehicle_diagnostics(self, *, vehicle_id: str, authorization: str):
        try:
            return self._request_json(
                url=self._build_url(
                    settings.TELEMETRY_HUB_BASE_URL,
                    f"/vehicles/{vehicle_id}/latest-diagnostics/",
                ),
                authorization=authorization,
                allow_not_found=True,
                expect_list=True,
            )
        except SourceNotFoundError:
            return []

    def list_terminals(self, *, authorization: str):
        return self._request_json(
            url=self._build_url(settings.TERMINAL_REGISTRY_BASE_URL, "/"),
            authorization=authorization,
            expect_list=True,
        )

    def list_installed_terminal_installations(self, *, authorization: str):
        return self._request_json(
            url=self._build_url(
                settings.TERMINAL_REGISTRY_BASE_URL,
                "/installations/?installation_status=installed",
            ),
            authorization=authorization,
            expect_list=True,
        )
