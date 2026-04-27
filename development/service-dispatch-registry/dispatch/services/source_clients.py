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
        method: str = "GET",
        body: dict | None = None,
    ):
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

    def list_drivers_by_external_user_name(
        self,
        *,
        external_user_name: str,
        company_id: str,
        fleet_id: str,
        authorization: str,
    ):
        return self._request_json(
            url=self._build_url(
                settings.DRIVER_PROFILE_BASE_URL,
                "/",
                query={
                    "external_user_name": external_user_name,
                    "company_id": company_id,
                    "fleet_id": fleet_id,
                },
            ),
            authorization=authorization,
            expect_list=True,
        )

    def list_daily_delivery_input_snapshots(
        self,
        *,
        company_id: str,
        fleet_id: str,
        service_date: str,
        status: str,
        authorization: str,
    ):
        return self._request_json(
            url=self._build_url(
                settings.DELIVERY_RECORD_BASE_URL,
                "/daily-snapshots/",
                query={
                    "company_id": company_id,
                    "fleet_id": fleet_id,
                    "service_date": service_date,
                    "status": status,
                },
            ),
            authorization=authorization,
            expect_list=True,
        )

    def sync_attendance_dispatch_signals(
        self,
        *,
        dispatch_date: str,
        rows: list[dict],
        authorization: str,
    ):
        signals = [
            {
                "driver_id": row["matched_driver_id"],
                "attendance_date": dispatch_date,
                "source_reference": f"{row['upload_batch_id']}:{row['upload_row_id']}",
                "small_region_text": row.get("small_region_text", ""),
                "detailed_region_text": row.get("detailed_region_text", ""),
                "box_count": int(row.get("box_count", 0) or 0),
                "household_count": int(row.get("household_count", 0) or 0),
                "raw_reason_code": "dispatch_upload_confirm",
                "raw_payload": {
                    "upload_batch_id": row["upload_batch_id"],
                    "upload_row_id": row["upload_row_id"],
                },
            }
            for row in rows
            if row.get("matched_driver_id")
        ]

        return self._request_json(
            url=self._build_url(settings.ATTENDANCE_REGISTRY_BASE_URL, "/internal/dispatch-signals:sync/"),
            authorization=authorization,
            method="POST",
            body={"signals": signals},
        )
