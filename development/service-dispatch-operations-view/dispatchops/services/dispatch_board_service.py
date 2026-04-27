from datetime import datetime, timezone

from django.utils.dateparse import parse_datetime

from dispatchops.services.source_clients import SourceClientError, SourceClients


class DispatchBoardService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def build_board(self, *, dispatch_date, fleet_id, authorization: str):
        plans = self._normalize_items(
            self.source_clients.list_dispatch_plans(
                dispatch_date=dispatch_date,
                fleet_id=fleet_id,
                authorization=authorization,
            )
        )
        assignments = self._normalize_planned_assignments(
            self.source_clients.list_dispatch_assignments(
                dispatch_date=dispatch_date,
                authorization=authorization,
            )
        )
        current_assignment_source_unavailable = False
        try:
            current_assignments = self._normalize_items(
                self.source_clients.list_assigned_assignments(authorization=authorization)
            )
        except SourceClientError:
            current_assignments = []
            current_assignment_source_unavailable = True
        vehicles = self._normalize_items(
            self.source_clients.list_vehicle_masters(authorization=authorization)
        )
        drivers = self._normalize_items(self.source_clients.list_drivers(authorization=authorization))
        outsourced_drivers = self._normalize_items(
            self.source_clients.list_outsourced_drivers(
                dispatch_date=dispatch_date,
                fleet_id=fleet_id,
                authorization=authorization,
            )
        )

        vehicle_map = {
            str(vehicle["vehicle_id"]): vehicle
            for vehicle in vehicles
            if isinstance(vehicle, dict) and vehicle.get("vehicle_id")
        }
        driver_map = {
            str(driver["driver_id"]): driver
            for driver in drivers
            if isinstance(driver, dict) and driver.get("driver_id")
        }
        outsourced_driver_map = {
            str(driver["outsourced_driver_id"]): driver
            for driver in outsourced_drivers
            if isinstance(driver, dict) and driver.get("outsourced_driver_id")
        }
        current_assignment_map = {}
        for current_assignment in current_assignments:
            vehicle_id = self._string_or_none(current_assignment.get("vehicle_id"))
            if vehicle_id is None:
                continue
            existing_assignment = current_assignment_map.get(vehicle_id)
            if existing_assignment is None or self._assignment_sort_key(
                current_assignment
            ) > self._assignment_sort_key(existing_assignment):
                current_assignment_map[vehicle_id] = current_assignment

        board = []
        matched_count = 0
        not_started_count = 0
        dispatch_unit_changed_count = 0
        planned_vehicle_ids = set()
        for assignment in assignments:
            vehicle_id = self._string_or_none(assignment.get("vehicle_id"))
            planned_driver_id = self._string_or_none(assignment.get("driver_id"))
            outsourced_driver_id = self._string_or_none(assignment.get("outsourced_driver_id"))
            planned_driver_kind = "outsourced" if outsourced_driver_id else "internal"
            planned_vehicle_ids.add(vehicle_id)
            vehicle = vehicle_map.get(vehicle_id) if vehicle_id else None
            planned_driver = driver_map.get(planned_driver_id) if planned_driver_id else None
            outsourced_driver = (
                outsourced_driver_map.get(outsourced_driver_id) if outsourced_driver_id else None
            )
            current_assignment = current_assignment_map.get(vehicle_id) if vehicle_id else None
            current_driver_id = self._string_or_none(
                current_assignment.get("driver_id") if current_assignment else None
            )
            current_driver = driver_map.get(current_driver_id) if current_driver_id else None
            warnings = []
            if vehicle_id and vehicle is None:
                warnings.append("vehicle_lookup_failed")
            if planned_driver_id and planned_driver is None:
                warnings.append("planned_driver_lookup_failed")
            if outsourced_driver_id and outsourced_driver is None:
                warnings.append("planned_outsourced_driver_lookup_failed")
            if current_driver_id and current_driver is None:
                warnings.append("current_driver_lookup_failed")
            if current_assignment_source_unavailable:
                warnings.append("current_assignment_source_unavailable")
            dispatch_status = "not_started"
            if current_driver_id and current_driver_id == planned_driver_id:
                dispatch_status = "matched"
            elif current_driver_id:
                dispatch_status = "dispatch_unit_changed"

            if dispatch_status == "matched":
                matched_count += 1
            elif dispatch_status == "dispatch_unit_changed":
                dispatch_unit_changed_count += 1
            else:
                not_started_count += 1

            board.append(
                {
                    "dispatch_date": str(assignment.get("dispatch_date")),
                    "vehicle_schedule_id": self._string_or_none(assignment.get("vehicle_schedule_id")),
                    "dispatch_assignment_id": self._string_or_none(assignment.get("dispatch_assignment_id")),
                    "shift_slot": assignment.get("shift_slot"),
                    "vehicle_id": vehicle_id,
                    "plate_number": vehicle.get("plate_number") if vehicle else None,
                    "planned_driver_kind": planned_driver_kind,
                    "outsourced_driver_id": outsourced_driver_id,
                    "planned_driver_id": planned_driver_id,
                    "planned_driver_name": (
                        planned_driver.get("name")
                        if planned_driver
                        else outsourced_driver.get("name")
                        if outsourced_driver
                        else None
                    ),
                    "current_driver_id": current_driver_id,
                    "current_driver_name": current_driver.get("name") if current_driver else None,
                    "dispatch_status": dispatch_status,
                    "warnings": warnings,
                }
            )

        unplanned_current_count = 0
        for vehicle_id, current_assignment in current_assignment_map.items():
            if vehicle_id in planned_vehicle_ids:
                continue

            current_driver_id = self._string_or_none(current_assignment.get("driver_id"))
            current_driver = driver_map.get(current_driver_id) if current_driver_id else None
            vehicle = vehicle_map.get(vehicle_id)
            warnings = []
            if vehicle is None:
                warnings.append("vehicle_lookup_failed")
            if current_driver_id and current_driver is None:
                warnings.append("current_driver_lookup_failed")

            board.append(
                {
                    "dispatch_date": str(dispatch_date),
                    "vehicle_schedule_id": None,
                    "dispatch_assignment_id": None,
                    "shift_slot": None,
                    "vehicle_id": vehicle_id,
                    "plate_number": vehicle.get("plate_number") if vehicle else None,
                    "planned_driver_kind": None,
                    "outsourced_driver_id": None,
                    "planned_driver_id": None,
                    "planned_driver_name": None,
                    "current_driver_id": current_driver_id,
                    "current_driver_name": current_driver.get("name") if current_driver else None,
                    "dispatch_status": "unplanned_current",
                    "warnings": warnings,
                }
            )
            unplanned_current_count += 1

        return {
            "board": board,
            "summary": {
                "dispatch_date": str(dispatch_date),
                "fleet_id": self._string_or_none(fleet_id),
                "planned_volume": sum(
                    plan.get("planned_volume", 0) or 0
                    for plan in plans
                    if isinstance(plan.get("planned_volume", 0) or 0, (int, float))
                ),
                "planned_assignment_count": len(assignments),
                "matched_count": matched_count,
                "not_started_count": not_started_count,
                "dispatch_unit_changed_count": dispatch_unit_changed_count,
                "unplanned_current_count": unplanned_current_count,
            },
        }

    def _string_or_none(self, value):
        if value is None:
            return None
        return str(value)

    def _normalize_items(self, payload):
        if not isinstance(payload, list):
            return []
        return [item for item in payload if isinstance(item, dict)]

    def _normalize_planned_assignments(self, payload):
        assignments = []
        for item in self._normalize_items(payload):
            if self._string_or_none(item.get("vehicle_id")) is None:
                continue
            assignments.append(item)
        return assignments

    def _assignment_sort_key(self, assignment):
        assigned_at = assignment.get("assigned_at")
        parsed_assigned_at = parse_datetime(str(assigned_at)) if assigned_at is not None else None
        if parsed_assigned_at is None:
            return (
                0,
                datetime.min.replace(tzinfo=timezone.utc),
                str(assignment.get("driver_vehicle_assignment_id") or ""),
            )
        if parsed_assigned_at.tzinfo is None:
            parsed_assigned_at = parsed_assigned_at.replace(tzinfo=timezone.utc)
        return (
            1,
            parsed_assigned_at.astimezone(timezone.utc),
            str(assignment.get("driver_vehicle_assignment_id") or ""),
        )
