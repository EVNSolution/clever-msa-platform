import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class SourceClientError(RuntimeError):
    pass


@dataclass
class SourceValidationError(SourceClientError):
    field: str
    message: str

    def __str__(self) -> str:
        return self.message


class SourceServiceError(SourceClientError):
    pass


class SourceAuthenticationError(SourceClientError):
    pass


class SourcePermissionError(SourceClientError):
    pass


class SourceClients:
    def _build_url(self, base_url: str, path: str) -> str:
        return f"{base_url.rstrip('/')}{path}"

    def _request_json(self, *, url: str, authorization: str):
        headers = {"Accept": "application/json"}
        if authorization:
            headers["Authorization"] = authorization

        request = Request(url, headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 404:
                raise SourceValidationError(field="", message="Not found.") from exc
            if exc.code == 401:
                raise SourceAuthenticationError("Upstream authentication failed.") from exc
            if exc.code == 403:
                raise SourcePermissionError("Upstream permission denied.") from exc
            raise SourceServiceError(f"Upstream request failed: {url}") from exc
        except (URLError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise SourceServiceError(f"Upstream request failed: {url}") from exc

        if not isinstance(payload, dict):
            raise SourceServiceError(f"Upstream request failed: {url}")
        return payload

    def validate_driver_exists(self, *, driver_id: str, authorization: str) -> None:
        url = self._build_url(settings.DRIVER_PROFILE_BASE_URL, f"/{driver_id}/")
        try:
            payload = self._request_json(url=url, authorization=authorization)
        except SourceValidationError as exc:
            raise SourceValidationError(field="driver_id", message="Referenced driver does not exist.") from exc

        if str(payload.get("driver_id")) != driver_id:
            raise SourceServiceError("Upstream request failed: malformed driver payload.")
