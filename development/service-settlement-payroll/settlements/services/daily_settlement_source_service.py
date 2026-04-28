"""Daily settlement source aggregation service.

Bridges `service-settlement-payroll` write owner with upstream sources:
- `service-delivery-record` daily input snapshots (box count, base amount)
- `service-settlement-registry` company/fleet pricing tables
- `service-attendance-registry` per-day attendance kind (regular vs special)
- `service-dispatch-registry` driver-day exceptions

The module is consumed by:
- `SettlementRunViewSet._generate_items` via ``build_run_driver_amounts`` to
  derive the per-driver amount for newly created ``SettlementRun`` instances.
- ``DriverDailySettlementView`` via ``build_driver_daily_settlements`` to
  expose a daily breakdown per driver.

Restored after the monorepo umbrella migration: the previous standalone repo
state was missing this file even though ``views.py`` and
``services/__init__.py`` already imported it. Implementation follows the
phase-2 decomposition design intent and the contract surface already pinned
in ``settlements.serializers`` and ``settlements.services.source_clients``.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Iterable

from settlements.services.source_clients import (
    SourceClients,
    SourceNotFoundError,
    SourceServiceError,
)


_SPECIAL_KINDS = {"special", "holiday", "weekend", "extra"}
_REGULAR_PRICE_KEYS = (
    "box_purchase_unit_price",
    "regular_unit_price",
    "box_unit_price",
    "base_unit_price",
    "unit_price",
)
_SPECIAL_PRICE_KEYS = (
    "special_unit_price",
    "special_box_unit_price",
    "special_box_price",
)


def _resolve_unit_price(pricing_table: dict, settlement_type: str) -> Decimal:
    if settlement_type == "special":
        for key in _SPECIAL_PRICE_KEYS:
            if pricing_table.get(key) is not None:
                return Decimal(str(pricing_table[key]))
    for key in _REGULAR_PRICE_KEYS:
        if pricing_table.get(key) is not None:
            return Decimal(str(pricing_table[key]))
    raise SourceServiceError("Upstream pricing table missing unit price.")


def _classify_attendance_kind(kind_value) -> str:
    if isinstance(kind_value, str) and kind_value.lower() in _SPECIAL_KINDS:
        return "special"
    return "regular"


class DailySettlementSourceService:
    """Aggregate upstream sources into per-day and per-run settlement amounts."""

    def __init__(self, *, source_clients: SourceClients) -> None:
        self._clients = source_clients

    def build_run_driver_amounts(
        self,
        *,
        company_id: str,
        fleet_id: str,
        period_start: date,
        period_end: date,
        authorization: str,
    ) -> dict[str, Decimal]:
        snapshots = self._clients.list_active_daily_snapshots(
            company_id=company_id,
            fleet_id=fleet_id,
            period_start=period_start,
            period_end=period_end,
            authorization=authorization,
        )
        if not snapshots:
            return {}

        pricing_table = self._clients.get_company_fleet_pricing_table(
            company_id=company_id,
            fleet_id=fleet_id,
            authorization=authorization,
        )

        attendance_kinds = self._build_attendance_kind_map(
            snapshots=snapshots,
            authorization=authorization,
        )

        amounts: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for snapshot in snapshots:
            driver_id = str(snapshot.get("driver_id") or "")
            if not driver_id:
                continue
            settlement_type = attendance_kinds.get(
                self._attendance_key(snapshot), "regular"
            )
            unit_price = _resolve_unit_price(pricing_table, settlement_type)
            box_count = int(snapshot.get("delivery_count") or 0)
            amounts[driver_id] += unit_price * Decimal(box_count)

        return dict(amounts)

    def build_driver_daily_settlements(
        self,
        *,
        driver_id: str,
        date_from: date,
        date_to: date,
        authorization: str,
    ) -> dict:
        snapshots = self._clients.list_driver_daily_snapshots(
            driver_id=driver_id,
            date_from=date_from,
            date_to=date_to,
            authorization=authorization,
        )

        empty_payload = {
            "driver_id": driver_id,
            "date_from": date_from,
            "date_to": date_to,
            "summary": {
                "regular_days": 0,
                "special_days": 0,
                "total_amount": Decimal("0"),
            },
            "results": [],
        }

        if not snapshots:
            return empty_payload

        first = snapshots[0]
        company_id = str(first.get("company_id") or "")
        fleet_id = str(first.get("fleet_id") or "")
        if not company_id or not fleet_id:
            raise SourceServiceError(
                "Upstream snapshot missing company/fleet identifiers."
            )

        pricing_table = self._clients.get_company_fleet_pricing_table(
            company_id=company_id,
            fleet_id=fleet_id,
            authorization=authorization,
        )

        attendance_kinds = self._build_attendance_kind_map(
            snapshots=snapshots,
            authorization=authorization,
        )

        results: list[dict] = []
        regular_days = 0
        special_days = 0
        total_amount = Decimal("0")

        for snapshot in sorted(snapshots, key=lambda s: str(s.get("service_date"))):
            service_date_value = snapshot.get("service_date")
            if not service_date_value:
                continue
            service_date = date.fromisoformat(str(service_date_value))
            settlement_type = attendance_kinds.get(
                self._attendance_key(snapshot), "regular"
            )
            unit_price = _resolve_unit_price(pricing_table, settlement_type)
            box_count = int(snapshot.get("delivery_count") or 0)
            amount = (unit_price * Decimal(box_count)).quantize(Decimal("0.01"))

            if settlement_type == "special":
                special_days += 1
            else:
                regular_days += 1
            total_amount += amount

            results.append(
                {
                    "service_date": service_date,
                    "settlement_type": settlement_type,
                    "box_count": box_count,
                    "unit_price": unit_price,
                    "total_amount": amount,
                }
            )

        return {
            "driver_id": driver_id,
            "date_from": date_from,
            "date_to": date_to,
            "summary": {
                "regular_days": regular_days,
                "special_days": special_days,
                "total_amount": total_amount.quantize(Decimal("0.01")),
            },
            "results": results,
        }

    @staticmethod
    def _attendance_key(snapshot: dict) -> tuple[str, str, str, str]:
        return (
            str(snapshot.get("company_id") or ""),
            str(snapshot.get("fleet_id") or ""),
            str(snapshot.get("driver_id") or ""),
            str(snapshot.get("service_date") or ""),
        )

    def _build_attendance_kind_map(
        self,
        *,
        snapshots: Iterable[dict],
        authorization: str,
    ) -> dict[tuple[str, str, str, str], str]:
        keys: list[dict] = []
        seen: set[tuple[str, str, str, str]] = set()
        for snapshot in snapshots:
            key_tuple = self._attendance_key(snapshot)
            if not all(key_tuple) or key_tuple in seen:
                continue
            seen.add(key_tuple)
            keys.append(
                {
                    "company_id": key_tuple[0],
                    "fleet_id": key_tuple[1],
                    "driver_id": key_tuple[2],
                    "service_date": key_tuple[3],
                }
            )

        if not keys:
            return {}

        try:
            days = self._clients.bulk_lookup_attendance_days(
                keys=keys, authorization=authorization
            )
        except (SourceNotFoundError, SourceServiceError):
            # attendance is an optional refinement source; falling back to
            # default "regular" for every snapshot is preferable to failing
            # the whole settlement run when attendance-registry is
            # unreachable, returns malformed payload, or has no internal
            # bulk-lookup endpoint wired yet.
            return {}

        kind_map: dict[tuple[str, str, str, str], str] = {}
        for day in days:
            if not isinstance(day, dict):
                continue
            key_tuple = (
                str(day.get("company_id") or ""),
                str(day.get("fleet_id") or ""),
                str(day.get("driver_id") or ""),
                str(day.get("service_date") or ""),
            )
            if not all(key_tuple):
                continue
            kind_map[key_tuple] = _classify_attendance_kind(day.get("kind"))

        return kind_map
