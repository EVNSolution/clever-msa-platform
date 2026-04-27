import json
from datetime import date
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings


class SourceClientError(Exception):
    """Base error for upstream source calls."""


class SourceNotFoundError(SourceClientError):
    """Raised when an upstream source returns 404 or expected data is missing."""


class SourceServiceError(SourceClientError):
    """Raised when an upstream source is unavailable or invalid."""


class SourceClients:
    def _build_url(self, base_url: str, path: str, query: dict | None = None) -> str:
        url = f"{base_url.rstrip('/')}{path}"
        if query:
            return f"{url}?{urlencode(query)}"
        return url

    def _request_json(self, *, url: str, authorization: str, method: str = "GET", body: dict | None = None):
        headers = {"Accept": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")

        request = Request(url, headers=headers, method=method, data=data)
        try:
            with urlopen(request, timeout=5) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 404:
                raise SourceNotFoundError(f"Upstream resource not found: {url}") from exc
            raise SourceServiceError(f"Upstream request failed: {url}") from exc
        except (URLError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise SourceServiceError(f"Upstream request failed: {url}") from exc

    def get_company_fleet_pricing_table(self, *, company_id: str, fleet_id: str, authorization: str):
        payload = self._request_json(
            url=self._build_url(
                settings.SETTLEMENT_REGISTRY_BASE_URL,
                "/pricing-tables/",
                query={"company_id": company_id, "fleet_id": fleet_id},
            ),
            authorization=authorization,
        )
        if not isinstance(payload, list):
            raise SourceServiceError("Upstream request failed: malformed pricing table payload.")
        if not payload:
            raise SourceNotFoundError("Company/fleet pricing table not found.")
        pricing_table = payload[0]
        if not isinstance(pricing_table, dict):
            raise SourceServiceError("Upstream request failed: malformed pricing table payload.")
        return pricing_table

    def list_active_daily_snapshots(
        self,
        *,
        company_id: str,
        fleet_id: str,
        period_start: date,
        period_end: date,
        authorization: str,
    ):
        payload = self._request_json(
            url=self._build_url(
                settings.DELIVERY_RECORD_BASE_URL,
                "/daily-snapshots/",
                query={
                    "company_id": company_id,
                    "fleet_id": fleet_id,
                    "status": "active",
                },
            ),
            authorization=authorization,
        )
        if not isinstance(payload, list):
            raise SourceServiceError("Upstream request failed: malformed snapshot list payload.")
        return [
            snapshot
            for snapshot in payload
            if isinstance(snapshot, dict)
            and period_start <= date.fromisoformat(str(snapshot.get("service_date"))) <= period_end
        ]

    def list_driver_daily_snapshots(
        self,
        *,
        driver_id: str,
        date_from: date,
        date_to: date,
        authorization: str,
    ):
        payload = self._request_json(
            url=self._build_url(
                settings.DELIVERY_RECORD_BASE_URL,
                "/daily-snapshots/",
                query={"driver_id": driver_id, "status": "active"},
            ),
            authorization=authorization,
        )
        if not isinstance(payload, list):
            raise SourceServiceError("Upstream request failed: malformed snapshot list payload.")
        return [
            snapshot
            for snapshot in payload
            if isinstance(snapshot, dict)
            and date_from <= date.fromisoformat(str(snapshot.get("service_date"))) <= date_to
        ]

    def list_driver_day_exceptions(
        self,
        *,
        company_id: str,
        fleet_id: str,
        period_start: date,
        period_end: date,
        authorization: str,
    ):
        payload = self._request_json(
            url=self._build_url(
                settings.DISPATCH_REGISTRY_BASE_URL,
                "/driver-day-exceptions/",
                query={"company_id": company_id, "fleet_id": fleet_id},
            ),
            authorization=authorization,
        )
        if not isinstance(payload, list):
            raise SourceServiceError("Upstream request failed: malformed driver day exception payload.")
        return [
            exception
            for exception in payload
            if isinstance(exception, dict)
            and period_start <= date.fromisoformat(str(exception.get("dispatch_date"))) <= period_end
        ]

    def bulk_lookup_attendance_days(self, *, keys: list[dict], authorization: str):
        payload = self._request_json(
            url=self._build_url(settings.ATTENDANCE_REGISTRY_BASE_URL, "/internal/days:bulk-lookup/"),
            authorization=authorization,
            method="POST",
            body={"keys": keys},
        )
        days = payload.get("days")
        if not isinstance(days, list):
            raise SourceServiceError("Upstream request failed: malformed attendance lookup payload.")
        return days
