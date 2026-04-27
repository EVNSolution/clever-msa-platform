from settlements.services.source_clients import SourceClients, SourceServiceError


class PagedLatestSettlementSummaryService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def build_page(
        self,
        *,
        authorization: str,
        company_id: str | None = None,
        fleet_id: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ):
        driver_page = self.source_clients.list_drivers(
            authorization=authorization,
            company_id=company_id,
            fleet_id=fleet_id,
            page=page,
            page_size=page_size,
        )
        drivers = driver_page.get("results", [])
        if not drivers:
            return {
                "count": driver_page.get("count", 0),
                "page": driver_page.get("page", page),
                "page_size": driver_page.get("page_size", page_size),
                "results": [],
            }

        runs = self.source_clients.list_settlement_runs(
            authorization=authorization,
            company_id=company_id,
            fleet_id=fleet_id,
        )
        items = self.source_clients.list_settlement_items(
            authorization=authorization,
            company_id=company_id,
            fleet_id=fleet_id,
        )

        run_map = {run["settlement_run_id"]: run for run in runs}
        driver_ids = {driver["driver_id"] for driver in drivers}
        latest_settlement_by_driver: dict[str, dict | None] = {driver_id: None for driver_id in driver_ids}

        for item in items:
            driver_id = item.get("driver_id")
            if driver_id not in driver_ids:
                continue

            run = run_map.get(item.get("settlement_run_id"))
            if run is None:
                continue

            next_summary = {
                "settlement_run_id": run["settlement_run_id"],
                "period_start": run["period_start"],
                "period_end": run["period_end"],
                "status": run["status"],
                "payout_status": item["payout_status"],
                "amount": item["amount"],
            }
            current_summary = latest_settlement_by_driver.get(driver_id)
            if current_summary is None or (
                next_summary["period_end"],
                next_summary["settlement_run_id"],
            ) > (
                current_summary["period_end"],
                current_summary["settlement_run_id"],
            ):
                latest_settlement_by_driver[driver_id] = next_summary

        results = []
        for driver in drivers:
            delivery_flags = self._get_delivery_history_flags(
                driver_id=driver["driver_id"],
                authorization=authorization,
            )
            results.append(
                {
                    "driver_id": driver["driver_id"],
                    "driver_name": driver["name"],
                    "delivery_history_present": delivery_flags["delivery_history_present"],
                    "attendance_inferred_from_delivery_history": delivery_flags[
                        "attendance_inferred_from_delivery_history"
                    ],
                    "latest_settlement": latest_settlement_by_driver.get(driver["driver_id"]),
                }
            )

        return {
            "count": driver_page.get("count", 0),
            "page": driver_page.get("page", page),
            "page_size": driver_page.get("page_size", page_size),
            "results": results,
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
