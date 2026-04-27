import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class PreviewUnavailableError(Exception):
    """Raised when settlement preview enrichment is unavailable."""


class PreviewClient:
    def get_snapshot_preview(self, *, snapshot_id: str, authorization: str) -> dict:
        headers = {"Accept": "application/json"}
        if authorization:
            headers["Authorization"] = authorization

        request = Request(
            f"{settings.SETTLEMENT_OPS_BASE_URL.rstrip('/')}/internal/settlement-inquiry-previews/{snapshot_id}/",
            headers=headers,
            method="GET",
        )
        try:
            with urlopen(request, timeout=5) as response:
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise PreviewUnavailableError("Preview is unavailable.") from exc
