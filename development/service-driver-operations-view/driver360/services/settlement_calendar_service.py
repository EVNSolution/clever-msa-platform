from driver360.services.source_clients import SourceClients


class SettlementCalendarService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def get_settlement_calendar(self, *, driver_account_id: str, date_from: str, date_to: str, authorization: str):
        links = self.source_clients.list_driver_account_links(
            driver_account_id=driver_account_id,
            authorization=authorization,
        )
        active_link = next((link for link in links if link.get("unlinked_at") is None), None)
        if active_link is None:
            return {"status": "needs_link", "results": []}

        daily_settlements = self.source_clients.list_daily_settlements(
            driver_id=active_link["driver_id"],
            date_from=date_from,
            date_to=date_to,
            authorization=authorization,
        )
        return {
            "status": "linked",
            **daily_settlements,
        }
