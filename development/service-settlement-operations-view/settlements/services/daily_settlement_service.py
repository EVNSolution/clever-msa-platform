"""Driver-scoped daily settlement read service.

`service-settlement-operations-view` is read-only and fans out to
`service-settlement-payroll` for settlement truth. This service exposes a
thin wrapper over the payroll daily-settlements endpoint so that the ops
view can serve `/drivers/<driver_id>/daily-settlements/` without owning
calculation logic.

Restored after the monorepo umbrella migration: ``views.py`` and
``services/__init__.py`` already imported this symbol but the file itself
was not committed. Implementation matches the contract surface pinned by
``DriverDailySettlementSerializer`` and the
``SourceClients.list_driver_daily_settlements`` upstream client.
"""

from settlements.services.source_clients import SourceClients


class DailySettlementReadService:
    """Read-only fan-out over settlement-payroll's daily-settlements API."""

    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def build_daily_settlements(
        self,
        *,
        driver_id: str,
        date_from: str,
        date_to: str,
        authorization: str,
    ) -> dict:
        return self.source_clients.list_driver_daily_settlements(
            driver_id=driver_id,
            date_from=date_from,
            date_to=date_to,
            authorization=authorization,
        )
