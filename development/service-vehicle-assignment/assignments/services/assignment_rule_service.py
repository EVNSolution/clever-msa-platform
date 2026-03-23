from django.utils import timezone

from assignments.exceptions import ServiceUnavailableError
from assignments.models import DriverVehicleAssignment
from assignments.services.source_clients import (
    SourceClients,
    SourceNotFoundError,
    SourceServiceError,
)


class AssignmentRuleViolation(Exception):
    def __init__(self, details: dict):
        super().__init__("Assignment validation failed.")
        self.details = details


class AssignmentRuleService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def validate_and_normalize(self, *, attributes: dict, authorization: str, instance=None):
        normalized = dict(attributes)
        assignment_status = normalized.get(
            "assignment_status",
            getattr(instance, "assignment_status", None),
        )

        if assignment_status == DriverVehicleAssignment.AssignmentStatus.UNASSIGNED:
            normalized["unassigned_at"] = normalized.get("unassigned_at") or timezone.now()
            return normalized

        if assignment_status == DriverVehicleAssignment.AssignmentStatus.ASSIGNED:
            normalized["unassigned_at"] = None
            self._validate_assigned_state(
                normalized=normalized,
                authorization=authorization,
                instance=instance,
            )
        return normalized

    def _validate_assigned_state(self, *, normalized: dict, authorization: str, instance=None):
        vehicle_id = str(normalized.get("vehicle_id", getattr(instance, "vehicle_id", "")))
        driver_id = str(normalized.get("driver_id", getattr(instance, "driver_id", "")))
        operator_company_id = str(
            normalized.get(
                "operator_company_id",
                getattr(instance, "operator_company_id", ""),
            )
        )

        try:
            vehicle = self.source_clients.get_vehicle(
                vehicle_id=vehicle_id,
                authorization=authorization,
            )
        except SourceNotFoundError as exc:
            raise AssignmentRuleViolation(
                {"vehicle_id": ["Vehicle does not exist."]}
            ) from exc
        except SourceServiceError as exc:
            raise ServiceUnavailableError("Vehicle validation is unavailable.") from exc

        if vehicle.get("vehicle_status") != "active":
            raise AssignmentRuleViolation(
                {"vehicle_id": ["Vehicle must be active before assignment."]}
            )

        try:
            operator_accesses = self.source_clients.list_vehicle_operator_accesses(
                vehicle_id=vehicle_id,
                access_status="active",
                authorization=authorization,
            )
        except SourceServiceError as exc:
            raise ServiceUnavailableError(
                "Operator access validation is unavailable."
            ) from exc

        if not any(
            str(access.get("operator_company_id")) == operator_company_id
            and access.get("access_status") == "active"
            for access in operator_accesses
        ):
            raise AssignmentRuleViolation(
                {
                    "operator_company_id": [
                        "An active operator access for this vehicle is required."
                    ]
                }
            )

        try:
            driver = self.source_clients.get_driver(
                driver_id=driver_id,
                authorization=authorization,
            )
        except SourceNotFoundError as exc:
            raise AssignmentRuleViolation(
                {"driver_id": ["Driver does not exist."]}
            ) from exc
        except SourceServiceError as exc:
            raise ServiceUnavailableError("Driver validation is unavailable.") from exc

        if str(driver.get("company_id")) != operator_company_id:
            raise AssignmentRuleViolation(
                {
                    "driver_id": [
                        "Driver company must match the operator company."
                    ]
                }
            )

        queryset = DriverVehicleAssignment.objects.filter(
            vehicle_id=vehicle_id,
            assignment_status=DriverVehicleAssignment.AssignmentStatus.ASSIGNED,
        )
        if instance is not None:
            queryset = queryset.exclude(
                driver_vehicle_assignment_id=instance.driver_vehicle_assignment_id
            )
        if queryset.exists():
            raise AssignmentRuleViolation(
                {"vehicle_id": ["A vehicle may have at most one assigned driver."]}
            )
