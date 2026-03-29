from settlements.services.source_clients import SourceClients, SourceServiceError


class LatestSettlementSummaryService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def build_summary(self, *, driver_id: str, authorization: str):
        runs = self.source_clients.list_settlement_runs(authorization=authorization)
        items = self.source_clients.list_settlement_items(authorization=authorization)
        delivery_history_flags = self._get_delivery_history_flags(
            driver_id=driver_id,
            authorization=authorization,
        )

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

        latest_settlement = None
        if matches:
            latest_settlement = max(
                matches,
                key=lambda summary: (summary["period_end"], summary["settlement_run_id"]),
            )

        return {
            "delivery_history_present": delivery_history_flags["delivery_history_present"],
            "attendance_inferred_from_delivery_history": delivery_history_flags[
                "attendance_inferred_from_delivery_history"
            ],
            "latest_settlement": latest_settlement,
        }

    def _get_delivery_history_flags(self, *, driver_id: str, authorization: str):
        try:
            delivery_records = self.source_clients.list_delivery_records(
                driver_id=driver_id,
                status="confirmed",
                authorization=authorization,
            )
        except SourceServiceError:
            return {
                "delivery_history_present": None,
                "attendance_inferred_from_delivery_history": None,
            }

        delivery_history_present = bool(delivery_records)
        return {
            "delivery_history_present": delivery_history_present,
            "attendance_inferred_from_delivery_history": delivery_history_present,
        }
