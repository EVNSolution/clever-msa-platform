"""Driver-scoped work log service.

Builds a per-day work log for the calling driver account by composing:

- attendance day truth from ``service-attendance-registry``
- daily delivery snapshots from ``service-delivery-record``

Resolves ``driver_account_id`` -> ``driver_id`` via the account-access
driver-account-link service. When no link is found, the response carries
``status="needs_link"`` so the driver app can prompt onboarding instead
of showing an empty calendar.

Restored after the monorepo umbrella migration: ``driver360.views``
imports this symbol but the module was not committed. Implementation
matches the contract surface pinned by ``DriverWorkLogMeView`` and the
``SourceClients.list_attendance_days`` /
``SourceClients.list_delivery_input_snapshots`` /
``SourceClients.list_driver_account_links`` upstream clients.
"""

from driver360.services.source_clients import (
    SourceClients,
    SourceServiceError,
)


_NEEDS_LINK = {"status": "needs_link", "results": []}


class WorkLogService:
    """Compose attendance + delivery snapshots into a per-day work log."""

    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def list_work_logs(
        self,
        *,
        driver_account_id: str,
        date_from: str,
        date_to: str,
        authorization: str,
    ) -> dict:
        driver_id = self._resolve_driver_id(
            driver_account_id=driver_account_id,
            authorization=authorization,
        )
        if not driver_id:
            return dict(_NEEDS_LINK)

        snapshots = self._safe_list_snapshots(
            driver_id=driver_id,
            date_from=date_from,
            date_to=date_to,
            authorization=authorization,
        )

        dates = sorted(
            {
                str(s.get("service_date") or "")
                for s in snapshots
                if s.get("service_date")
            }
        )

        attendance_by_date = self._safe_attendance_map(
            driver_id=driver_id,
            dates=dates,
            authorization=authorization,
        )

        snapshot_by_date = {
            str(s.get("service_date") or ""): s
            for s in snapshots
            if s.get("service_date")
        }

        results = []
        for d in dates:
            snapshot = snapshot_by_date.get(d, {})
            attendance = attendance_by_date.get(d, {})
            results.append(
                {
                    "service_date": d,
                    "attendance_status": attendance.get("status") or "unknown",
                    "attendance_kind": attendance.get("kind") or "regular",
                    "delivery_count": int(snapshot.get("delivery_count") or 0),
                    "total_distance_km": str(
                        snapshot.get("total_distance_km") or "0"
                    ),
                    "total_base_amount": str(
                        snapshot.get("total_base_amount") or "0"
                    ),
                }
            )

        return {
            "status": "linked",
            "driver_id": driver_id,
            "date_from": date_from,
            "date_to": date_to,
            "results": results,
        }

    def _resolve_driver_id(
        self,
        *,
        driver_account_id: str,
        authorization: str,
    ) -> str:
        try:
            links = self.source_clients.list_driver_account_links(
                driver_account_id=driver_account_id,
                authorization=authorization,
            )
        except SourceServiceError:
            return ""
        if not links:
            return ""
        return str(links[0].get("driver_id") or "")

    def _safe_list_snapshots(
        self,
        *,
        driver_id: str,
        date_from: str,
        date_to: str,
        authorization: str,
    ) -> list:
        try:
            return self.source_clients.list_delivery_input_snapshots(
                driver_id=driver_id,
                date_from=date_from,
                date_to=date_to,
                authorization=authorization,
            )
        except SourceServiceError:
            return []

    def _safe_attendance_map(
        self,
        *,
        driver_id: str,
        dates: list,
        authorization: str,
    ) -> dict:
        if not dates:
            return {}
        try:
            days = self.source_clients.list_attendance_days(
                driver_id=driver_id,
                dates=dates,
                authorization=authorization,
            )
        except SourceServiceError:
            return {}

        return {
            str(d.get("attendance_date") or d.get("service_date") or ""): d
            for d in days
            if isinstance(d, dict)
        }
