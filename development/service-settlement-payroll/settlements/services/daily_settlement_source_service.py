from datetime import date
from decimal import Decimal

from settlements.services.source_clients import SourceClients, SourceNotFoundError, SourceServiceError


class DailySettlementSourceService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def build_run_driver_amounts(
        self,
        *,
        company_id: str,
        fleet_id: str,
        period_start: date,
        period_end: date,
        authorization: str,
    ) -> dict[str, Decimal]:
        daily_rows = self._build_daily_rows_for_scope(
            company_id=company_id,
            fleet_id=fleet_id,
            period_start=period_start,
            period_end=period_end,
            authorization=authorization,
        )
        amounts: dict[str, Decimal] = {}
        for row in daily_rows:
            driver_id = row["driver_id"]
            amounts[driver_id] = amounts.get(driver_id, Decimal("0.00")) + row["total_amount"]
        return amounts

    def build_driver_daily_settlements(
        self,
        *,
        driver_id: str,
        date_from: date,
        date_to: date,
        authorization: str,
    ) -> dict:
        snapshots = self.source_clients.list_driver_daily_snapshots(
            driver_id=driver_id,
            date_from=date_from,
            date_to=date_to,
            authorization=authorization,
        )
        if not snapshots:
            return self._build_daily_payload(
                driver_id=driver_id,
                date_from=date_from,
                date_to=date_to,
                results=[],
            )

        company_id, fleet_id = self._infer_scope_from_snapshots(snapshots)
        pricing_table = self.source_clients.get_company_fleet_pricing_table(
            company_id=company_id,
            fleet_id=fleet_id,
            authorization=authorization,
        )
        rows = self._build_daily_rows(
            snapshots=snapshots,
            attendance_days=self._lookup_attendance_days(snapshots=snapshots, authorization=authorization),
            driver_day_exceptions=self.source_clients.list_driver_day_exceptions(
                company_id=company_id,
                fleet_id=fleet_id,
                period_start=date_from,
                period_end=date_to,
                authorization=authorization,
            ),
            unit_price=Decimal(str(pricing_table["box_purchase_unit_price"])),
        )
        driver_rows = [row for row in rows if row["driver_id"] == driver_id]
        return self._build_daily_payload(
            driver_id=driver_id,
            date_from=date_from,
            date_to=date_to,
            results=[
                {
                    "service_date": row["service_date"],
                    "settlement_type": row["settlement_type"],
                    "box_count": row["box_count"],
                    "unit_price": row["unit_price"],
                    "total_amount": row["total_amount"],
                }
                for row in driver_rows
            ],
        )

    def _build_daily_rows_for_scope(
        self,
        *,
        company_id: str,
        fleet_id: str,
        period_start: date,
        period_end: date,
        authorization: str,
    ) -> list[dict]:
        pricing_table = self.source_clients.get_company_fleet_pricing_table(
            company_id=company_id,
            fleet_id=fleet_id,
            authorization=authorization,
        )
        snapshots = self.source_clients.list_active_daily_snapshots(
            company_id=company_id,
            fleet_id=fleet_id,
            period_start=period_start,
            period_end=period_end,
            authorization=authorization,
        )
        return self._build_daily_rows(
            snapshots=snapshots,
            attendance_days=self._lookup_attendance_days(snapshots=snapshots, authorization=authorization),
            driver_day_exceptions=self.source_clients.list_driver_day_exceptions(
                company_id=company_id,
                fleet_id=fleet_id,
                period_start=period_start,
                period_end=period_end,
                authorization=authorization,
            ),
            unit_price=Decimal(str(pricing_table["box_purchase_unit_price"])),
        )

    def _lookup_attendance_days(self, *, snapshots: list[dict], authorization: str) -> list[dict]:
        keys = [
            {
                "driver_id": str(snapshot.get("driver_id", "")),
                "attendance_date": str(snapshot.get("service_date", "")),
            }
            for snapshot in snapshots
            if snapshot.get("driver_id") and snapshot.get("service_date")
        ]
        if not keys:
            return []
        return self.source_clients.bulk_lookup_attendance_days(keys=keys, authorization=authorization)

    def _build_daily_rows(
        self,
        *,
        snapshots: list[dict],
        attendance_days: list[dict],
        driver_day_exceptions: list[dict],
        unit_price: Decimal,
    ) -> list[dict]:
        attendance_by_key = {
            (str(day.get("driver_id", "")), str(day.get("attendance_date", ""))): day
            for day in attendance_days
            if isinstance(day, dict)
        }
        special_keys = {
            (str(exception.get("driver_id", "")), str(exception.get("dispatch_date", "")))
            for exception in driver_day_exceptions
            if isinstance(exception, dict)
            and (exception.get("work_rule") or {}).get("system_kind") == "overtime"
        }

        rows: list[dict] = []
        quantized_unit_price = unit_price.quantize(Decimal("0.01"))
        for snapshot in snapshots:
            driver_id = str(snapshot.get("driver_id", ""))
            service_date = str(snapshot.get("service_date", ""))
            if not driver_id or not service_date:
                continue

            attendance_day = attendance_by_key.get((driver_id, service_date))
            if attendance_day is None:
                raise SourceNotFoundError("Attendance truth is required for settlement payroll.")
            if attendance_day.get("final_status") != "worked":
                continue

            box_count = int(snapshot.get("delivery_count", 0) or 0)
            total_amount = (Decimal(box_count) * quantized_unit_price).quantize(Decimal("0.01"))
            rows.append(
                {
                    "driver_id": driver_id,
                    "service_date": service_date,
                    "settlement_type": "special" if (driver_id, service_date) in special_keys else "regular",
                    "box_count": box_count,
                    "unit_price": quantized_unit_price,
                    "total_amount": total_amount,
                }
            )

        rows.sort(key=lambda row: (row["service_date"], row["driver_id"]))
        return rows

    def _infer_scope_from_snapshots(self, snapshots: list[dict]) -> tuple[str, str]:
        scopes = {
            (str(snapshot.get("company_id", "")), str(snapshot.get("fleet_id", "")))
            for snapshot in snapshots
            if snapshot.get("company_id") and snapshot.get("fleet_id")
        }
        if not scopes:
            raise SourceNotFoundError("Company/fleet pricing table not found.")
        if len(scopes) != 1:
            raise SourceServiceError("Driver daily snapshots span multiple pricing scopes.")
        return next(iter(scopes))

    def _build_daily_payload(self, *, driver_id: str, date_from: date, date_to: date, results: list[dict]) -> dict:
        summary = {
            "regular_days": sum(1 for row in results if row["settlement_type"] == "regular"),
            "special_days": sum(1 for row in results if row["settlement_type"] == "special"),
            "total_amount": sum((row["total_amount"] for row in results), Decimal("0.00")).quantize(Decimal("0.01")),
        }
        return {
            "driver_id": driver_id,
            "date_from": date_from,
            "date_to": date_to,
            "summary": summary,
            "results": results,
        }
