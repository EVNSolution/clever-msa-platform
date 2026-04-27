from datetime import datetime, timezone

from dispatch.exceptions import ServiceUnavailableError
from dispatch.models import DispatchAssignment, VehicleSchedule
from dispatch.services.source_clients import (
    SourceClients,
    SourceNotFoundError,
    SourceServiceError,
)


class DispatchRuleViolation(Exception):
    def __init__(self, details: dict):
        super().__init__("Dispatch rule violation")
        self.details = details


class DispatchRuleService:
    def __init__(self, source_clients: SourceClients | None = None):
        self.source_clients = source_clients or SourceClients()

    def validate_and_normalize(self, *, attributes: dict, authorization: str, instance=None) -> dict:
        normalized = dict(attributes)
        schedule = normalized.get("vehicle_schedule") or getattr(instance, "vehicle_schedule", None)
        if schedule is None:
            raise DispatchRuleViolation({"vehicle_schedule_id": ["vehicle_schedule_id is required."]})

        assignment_status = normalized.get(
            "assignment_status",
            getattr(instance, "assignment_status", DispatchAssignment.AssignmentStatus.ASSIGNED),
        )
        if (
            assignment_status == DispatchAssignment.AssignmentStatus.UNASSIGNED
            and normalized.get("unassigned_at") is None
        ):
            normalized["unassigned_at"] = datetime.now(timezone.utc)

        vehicle_id = str(normalized.get("vehicle_id") or getattr(instance, "vehicle_id", ""))
        driver_id = str(normalized.get("driver_id") or getattr(instance, "driver_id", ""))
        outsourced_driver = normalized.get("outsourced_driver")
        if outsourced_driver is None and instance is not None:
            outsourced_driver = getattr(instance, "outsourced_driver", None)
        operator_company_id = str(
            normalized.get("operator_company_id") or getattr(instance, "operator_company_id", "")
        )

        has_internal_driver = bool(driver_id)
        has_outsourced_driver = outsourced_driver is not None
        if has_internal_driver == has_outsourced_driver:
            message = "Exactly one of driver_id or outsourced_driver_id is required."
            raise DispatchRuleViolation(
                {
                    "driver_id": [message],
                    "outsourced_driver_id": [message],
                }
            )

        try:
            vehicle = self.source_clients.get_vehicle(
                vehicle_id=vehicle_id,
                authorization=authorization,
            )
            operator_accesses = self.source_clients.list_vehicle_operator_accesses(
                vehicle_id=vehicle_id,
                access_status="active",
                authorization=authorization,
            )
            driver = None
            if has_internal_driver:
                driver = self.source_clients.get_driver(
                    driver_id=driver_id,
                    authorization=authorization,
                )
        except SourceNotFoundError as exc:
            message = str(exc)
            if driver_id and driver_id in message:
                raise DispatchRuleViolation({"driver_id": ["Unknown driver_id."]}) from exc
            raise DispatchRuleViolation({"vehicle_id": ["Unknown vehicle_id."]}) from exc
        except SourceServiceError as exc:
            raise ServiceUnavailableError("Dispatch validation is unavailable.") from exc

        if vehicle.get("vehicle_status") != "active":
            raise DispatchRuleViolation({"vehicle_id": ["Vehicle must be active."]})
        if not operator_accesses:
            raise DispatchRuleViolation({"operator_company_id": ["No active operator access found."]})
        active_operator_company_id = str(operator_accesses[0].get("operator_company_id", ""))
        if operator_company_id != active_operator_company_id:
            raise DispatchRuleViolation(
                {"operator_company_id": ["operator_company_id must match the active vehicle operator access."]}
            )
        if has_internal_driver and not driver:
            raise DispatchRuleViolation({"driver_id": ["Unknown driver_id."]})
        if schedule.schedule_status != VehicleSchedule.ScheduleStatus.PLANNED:
            raise DispatchRuleViolation(
                {"vehicle_schedule_id": ["Assigned dispatch requires a planned vehicle schedule."]}
            )
        return normalized
