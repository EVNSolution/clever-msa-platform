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
                raw_payload = response.read()
                payload = json.loads(raw_payload.decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 404 and allow_not_found:
                raise SourceNotFoundError(url) from exc
            raise SourceServiceError(f"Upstream request failed: {url}") from exc
        except (URLError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise SourceServiceError(f"Upstream request failed: {url}") from exc

        if expect_list and not isinstance(payload, list):
            raise SourceServiceError(f"Upstream request failed: {url}")
        return payload

    def _filter_items(self, items, **criteria):
        filtered = []
        for item in items:
            if not isinstance(item, dict):
                raise SourceServiceError("Upstream request failed: malformed list payload.")
            if all(str(item.get(key)) == str(value) for key, value in criteria.items()):
                filtered.append(item)
        return filtered

    def list_dispatch_plans(self, *, dispatch_date, fleet_id, authorization: str):
        payload = self._request_json(
            url=self._build_url(
                settings.DISPATCH_REGISTRY_BASE_URL,
                "/plans/",
                {
                    "dispatch_date": dispatch_date,
                    "fleet_id": fleet_id,
                },
            ),
            authorization=authorization,
            expect_list=True,
        )
        return self._filter_items(payload, dispatch_date=dispatch_date, fleet_id=fleet_id)

    def list_dispatch_assignments(self, *, dispatch_date, authorization: str):
        payload = self._request_json(
            url=self._build_url(
                settings.DISPATCH_REGISTRY_BASE_URL,
                "/assignments/",
                {
                    "dispatch_date": dispatch_date,
                    "assignment_status": "assigned",
                },
            ),
            authorization=authorization,
            expect_list=True,
        )
        return self._filter_items(payload, dispatch_date=dispatch_date, assignment_status="assigned")

    def list_outsourced_drivers(self, *, dispatch_date, fleet_id, authorization: str):
        payload = self._request_json(
            url=self._build_url(
                settings.DISPATCH_REGISTRY_BASE_URL,
                "/outsourced-drivers/",
                {
                    "dispatch_date": dispatch_date,
                    "fleet_id": fleet_id,
                },
            ),
            authorization=authorization,
            expect_list=True,
        )
        return self._filter_items(payload, dispatch_date=dispatch_date, fleet_id=fleet_id)

    def list_assigned_assignments(self, *, authorization: str):
        payload = self._request_json(
            url=self._build_url(settings.DRIVER_VEHICLE_ASSIGNMENT_BASE_URL, "/assignments/"),
            authorization=authorization,
            expect_list=True,
        )
        return self._filter_items(payload, assignment_status="assigned")

    def list_vehicle_masters(self, *, authorization: str):
        return self._request_json(
            url=self._build_url(settings.VEHICLE_ASSET_BASE_URL, "/vehicle-masters/"),
            authorization=authorization,
            expect_list=True,
        )

    def list_drivers(self, *, authorization: str):
        return self._request_json(
            url=self._build_url(settings.DRIVER_PROFILE_BASE_URL, "/"),
            authorization=authorization,
            expect_list=True,
        )
