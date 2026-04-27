"""Driver-scoped settlement calendar service.

Resolves the calling driver account into a driver_id (via
account-access driver-account-links) and fans out to
``service-settlement-operations-view`` for the daily-settlement calendar
shape used by the driver app.

Returns a payload that matches ``SettlementCalendarSerializer``:

- ``status="needs_link"`` when no driver_account_link exists (or the
  upstream link service is unavailable).
- ``status="linked"`` with ``driver_id``, ``date_from``, ``date_to``,
  ``summary``, and ``results`` mirrored from settlement-ops.

Restored after the monorepo umbrella migration: ``views.py`` already
imported this symbol but the file itself was not committed. Implementation
matches the contract surface pinned by ``SettlementCalendarSerializer``
and the ``SourceClients.list_daily_settlements`` /
``SourceClients.list_driver_account_links`` upstream clients.
"""

from driver360.services.source_clients import (
    SourceClients,
    SourceServiceError,
)


_NEEDS_LINK = {"status": "needs_link", "results": []}


class SettlementCalendarService:
    """Resolve driver_account_id -> driver_id, then fan out to settlement-ops."""

    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def get_settlement_calendar(
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

        payload = self.source_clients.list_daily_settlements(
            driver_id=driver_id,
            date_from=date_from,
            date_to=date_to,
            authorization=authorization,
        )

        return {
            "status": "linked",
            "driver_id": payload.get("driver_id") or driver_id,
            "date_from": payload.get("date_from") or date_from,
            "date_to": payload.get("date_to") or date_to,
            "summary": payload.get("summary")
            or {
                "regular_days": 0,
                "special_days": 0,
                "total_amount": "0",
            },
            "results": payload.get("results") or [],
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
