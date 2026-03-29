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
    def _build_url(self, base_url: str, path: str) -> str:
        return f"{base_url.rstrip('/')}{path}"

    def _request_json(self, *, url: str, authorization: str, allow_not_found: bool = False):
        headers = {"Accept": "application/json"}
        if authorization:
            headers["Authorization"] = authorization

        request = Request(url, headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 404 and allow_not_found:
                raise SourceNotFoundError(url) from exc
            raise SourceServiceError(f"Upstream request failed: {url}") from exc
        except (URLError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise SourceServiceError(f"Upstream request failed: {url}") from exc

    def list_settlement_runs(self, *, authorization: str):
        payload = self._request_json(
            url=self._build_url(settings.SETTLEMENT_PAYROLL_BASE_URL, "/runs/"),
            authorization=authorization,
        )
        if not isinstance(payload, list):
            raise SourceServiceError("Upstream request failed: malformed run list payload.")
        return payload

    def get_settlement_run(self, *, settlement_run_id: str, authorization: str):
        payload = self._request_json(
            url=self._build_url(
                settings.SETTLEMENT_PAYROLL_BASE_URL,
                f"/runs/{settlement_run_id}/",
            ),
            authorization=authorization,
            allow_not_found=True,
        )
        if not isinstance(payload, dict):
            raise SourceServiceError("Upstream request failed: malformed run payload.")
        return payload

    def list_settlement_items(self, *, authorization: str):
        payload = self._request_json(
            url=self._build_url(settings.SETTLEMENT_PAYROLL_BASE_URL, "/items/"),
            authorization=authorization,
        )
        if not isinstance(payload, list):
            raise SourceServiceError("Upstream request failed: malformed item list payload.")
        return payload

    def list_delivery_records(self, *, driver_id: str, status: str, authorization: str):
        query_string = urlencode({"driver_id": driver_id, "status": status})
        payload = self._request_json(
            url=self._build_url(
                settings.DELIVERY_RECORD_BASE_URL,
                f"/records/?{query_string}",
            ),
            authorization=authorization,
        )
        if not isinstance(payload, list):
            raise SourceServiceError("Upstream request failed: malformed delivery record payload.")
        return payload

    def get_settlement_item(self, *, settlement_item_id: str, authorization: str):
        payload = self._request_json(
            url=self._build_url(
                settings.SETTLEMENT_PAYROLL_BASE_URL,
                f"/items/{settlement_item_id}/",
            ),
            authorization=authorization,
            allow_not_found=True,
        )
        if not isinstance(payload, dict):
            raise SourceServiceError("Upstream request failed: malformed item payload.")
        return payload
