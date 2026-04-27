import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class SourceClientError(Exception):
    """Base error for upstream source calls."""


class SourceNotFoundError(SourceClientError):
    """Raised when an upstream source returns 404 or expected data is missing."""


class SourceServiceError(SourceClientError):
    """Raised when an upstream source is unavailable or invalid."""


class SourceClients:
    def _build_url(self, base_url: str, path: str) -> str:
        return f"{base_url.rstrip('/')}{path}"

    def _request_json(self, *, url: str, authorization: str):
        headers = {"Accept": "application/json"}
        if authorization:
            headers["Authorization"] = authorization

        request = Request(url, headers=headers, method="GET")
        try:
            with urlopen(request, timeout=5) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 404:
                raise SourceNotFoundError("Snapshot not found.") from exc
            raise SourceServiceError("Snapshot validation failed.") from exc
        except (URLError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise SourceServiceError("Snapshot validation failed.") from exc

    def validate_snapshot_reference(
        self,
        *,
        snapshot_id: str,
        driver_id: str,
        authorization: str,
    ) -> dict:
        payload = self._request_json(
            url=self._build_url(
                settings.DELIVERY_RECORD_BASE_URL,
                f"/daily-snapshots/{snapshot_id}/",
            ),
            authorization=authorization,
        )
        if str(payload.get("daily_delivery_input_snapshot_id")) != snapshot_id:
            raise SourceNotFoundError("Snapshot not found.")
        payload_driver_id = str(payload.get("driver_id", ""))
        if payload_driver_id and payload_driver_id != driver_id:
            raise SourceNotFoundError("Snapshot not found.")
        return payload
