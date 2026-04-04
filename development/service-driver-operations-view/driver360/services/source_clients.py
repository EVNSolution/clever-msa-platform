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
        except (URLError, json.JSONDecodeError) as exc:
            raise SourceServiceError(f"Upstream request failed: {url}") from exc

    def get_driver(self, *, driver_ref: str, authorization: str):
        return self._request_json(
            url=self._build_url(settings.DRIVER_PROFILE_BASE_URL, f"/{driver_ref}/"),
            authorization=authorization,
            allow_not_found=True,
        )

    def list_companies(self, *, authorization: str):
        return self._request_json(
            url=self._build_url(settings.ORGANIZATION_MASTER_BASE_URL, "/companies/"),
            authorization=authorization,
        )

    def list_fleets(self, *, authorization: str):
        return self._request_json(
            url=self._build_url(settings.ORGANIZATION_MASTER_BASE_URL, "/fleets/"),
            authorization=authorization,
        )

    def list_driver_account_links(self, *, driver_id: str, authorization: str):
        payload = self._request_json(
            url=self._build_url(
                settings.ACCOUNT_AUTH_BASE_URL,
                f"/driver-account-links/?driver_id={driver_id}",
            ),
            authorization=authorization,
        )
        if not isinstance(payload, list):
            raise SourceServiceError("Upstream request failed: malformed driver account link payload.")
        return payload

    def get_latest_settlement(self, *, driver_id: str, authorization: str):
        payload = self._request_json(
            url=self._build_url(
                settings.SETTLEMENT_OPS_BASE_URL,
                f"/drivers/{driver_id}/latest-settlement/",
            ),
            authorization=authorization,
        )
        if not isinstance(payload, dict):
            raise SourceServiceError("Upstream request failed: malformed latest settlement payload.")
        return payload

    def list_personnel_documents(self, *, driver_id: str, authorization: str):
        payload = self._request_json(
            url=self._build_url(
                settings.PERSONNEL_DOCUMENT_BASE_URL,
                f"/documents/?driver_id={driver_id}",
            ),
            authorization=authorization,
        )
        if not isinstance(payload, list):
            raise SourceServiceError("Upstream request failed: malformed personnel document payload.")
        return payload
