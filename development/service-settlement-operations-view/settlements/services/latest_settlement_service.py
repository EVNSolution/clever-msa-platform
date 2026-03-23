from settlements.services.source_clients import SourceClients


class LatestSettlementSummaryService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def build_summary(self, *, driver_id: str, authorization: str):
        runs = self.source_clients.list_settlement_runs(authorization=authorization)
        items = self.source_clients.list_settlement_items(authorization=authorization)

        run_map = {run["settlement_run_id"]: run for run in runs}
        matches = []
        for item in items:
            if item.get("driver_id") != driver_id:
                continue

            run = run_map.get(item.get("settlement_run_id"))
            if run is None:
                continue

            matches.append(
                {
                    "settlement_run_id": run["settlement_run_id"],
                    "period_start": run["period_start"],
                    "period_end": run["period_end"],
                    "status": run["status"],
                    "payout_status": item["payout_status"],
                    "amount": item["amount"],
                }
            )

        if not matches:
            return None

        return max(matches, key=lambda summary: (summary["period_end"], summary["settlement_run_id"]))
