from settlements.services.source_clients import SourceClients, SourceServiceError


class DailySettlementReadService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def build_daily_settlements(self, *, driver_id: str, date_from: str, date_to: str, authorization: str):
        payroll_payload = self.source_clients.list_driver_daily_settlements(
            driver_id=driver_id,
            date_from=date_from,
            date_to=date_to,
            authorization=authorization,
        )
        snapshots = self.source_clients.list_driver_daily_snapshots(
            driver_id=driver_id,
            date_from=date_from,
            date_to=date_to,
            authorization=authorization,
        )
        snapshot_by_service_date = {
            str(snapshot.get("service_date")): snapshot.get("daily_delivery_input_snapshot_id")
            for snapshot in snapshots
        }

        results = []
        for row in payroll_payload.get("results", []):
            service_date = str(row.get("service_date"))
            snapshot_id = snapshot_by_service_date.get(service_date)
            if not snapshot_id:
                raise SourceServiceError(f"Missing delivery snapshot for settlement date: {service_date}")
            results.append(
                {
                    **row,
                    "daily_delivery_input_snapshot_id": snapshot_id,
                }
            )

        return {
            **payroll_payload,
            "results": results,
        }
