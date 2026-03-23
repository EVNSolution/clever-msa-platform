from datetime import date, datetime, timezone
from importlib import import_module
from uuid import UUID, uuid4

from django.test import TestCase


def _load_models_module(test_case: TestCase):
    try:
        return import_module("dispatch.models")
    except ModuleNotFoundError as exc:
        test_case.fail(f"dispatch.models module missing: {exc}")


def _load_rule_module(test_case: TestCase):
    try:
        return import_module("dispatch.services.dispatch_rule_service")
    except ModuleNotFoundError as exc:
        test_case.fail(f"dispatch_rule_service module missing: {exc}")


class StubSourceClients:
    def __init__(
        self,
        *,
        vehicle=None,
        operator_accesses=None,
        driver=None,
        vehicle_missing=False,
        driver_missing=False,
    ):
        self.vehicle = vehicle
        self.operator_accesses = operator_accesses or []
        self.driver = driver
        self.vehicle_missing = vehicle_missing
        self.driver_missing = driver_missing

    def get_vehicle(self, *, vehicle_id: str, authorization: str):
        if self.vehicle_missing:
            source_clients = import_module("dispatch.services.source_clients")
            raise source_clients.SourceNotFoundError(vehicle_id)
        return self.vehicle

    def list_vehicle_operator_accesses(
        self, *, vehicle_id: str, access_status: str, authorization: str
    ):
        return self.operator_accesses

    def get_driver(self, *, driver_id: str, authorization: str):
        if self.driver_missing:
            source_clients = import_module("dispatch.services.source_clients")
            raise source_clients.SourceNotFoundError(driver_id)
        return self.driver


class DispatchRuleServiceTests(TestCase):
    def test_rejects_missing_vehicle(self):
        models_module = _load_models_module(self)
        rule_module = _load_rule_module(self)
        schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        service = rule_module.DispatchRuleService(
            source_clients=StubSourceClients(vehicle_missing=True)
        )

        with self.assertRaises(rule_module.DispatchRuleViolation) as context:
            service.validate_and_normalize(
                attributes={
                    "vehicle_schedule": schedule,
                    "vehicle_id": schedule.vehicle_id,
                    "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                    "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                    "dispatch_date": schedule.dispatch_date,
                    "shift_slot": schedule.shift_slot,
                    "assignment_status": "assigned",
                    "assigned_at": datetime(2026, 3, 24, 9, 0, tzinfo=timezone.utc),
                    "unassigned_at": None,
                },
                authorization="Bearer token",
            )

        self.assertIn("vehicle_id", context.exception.details)

    def test_rejects_operator_snapshot_mismatch(self):
        models_module = _load_models_module(self)
        rule_module = _load_rule_module(self)
        schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        service = rule_module.DispatchRuleService(
            source_clients=StubSourceClients(
                vehicle={
                    "vehicle_id": str(schedule.vehicle_id),
                    "vehicle_status": "active",
                },
                operator_accesses=[
                    {
                        "operator_company_id": "30000000-0000-0000-0000-000000000099",
                        "access_status": "active",
                    }
                ],
                driver={
                    "driver_id": "10000000-0000-0000-0000-000000000001",
                    "company_id": "30000000-0000-0000-0000-000000000001",
                },
            )
        )

        with self.assertRaises(rule_module.DispatchRuleViolation) as context:
            service.validate_and_normalize(
                attributes={
                    "vehicle_schedule": schedule,
                    "vehicle_id": schedule.vehicle_id,
                    "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                    "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                    "dispatch_date": schedule.dispatch_date,
                    "shift_slot": schedule.shift_slot,
                    "assignment_status": "assigned",
                    "assigned_at": datetime(2026, 3, 24, 9, 0, tzinfo=timezone.utc),
                    "unassigned_at": None,
                },
                authorization="Bearer token",
            )

        self.assertIn("operator_company_id", context.exception.details)

    def test_rejects_missing_driver(self):
        models_module = _load_models_module(self)
        rule_module = _load_rule_module(self)
        schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        service = rule_module.DispatchRuleService(
            source_clients=StubSourceClients(
                vehicle={
                    "vehicle_id": str(schedule.vehicle_id),
                    "vehicle_status": "active",
                },
                operator_accesses=[
                    {
                        "operator_company_id": "30000000-0000-0000-0000-000000000001",
                        "access_status": "active",
                    }
                ],
                driver_missing=True,
            )
        )

        with self.assertRaises(rule_module.DispatchRuleViolation) as context:
            service.validate_and_normalize(
                attributes={
                    "vehicle_schedule": schedule,
                    "vehicle_id": schedule.vehicle_id,
                    "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                    "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                    "dispatch_date": schedule.dispatch_date,
                    "shift_slot": schedule.shift_slot,
                    "assignment_status": "assigned",
                    "assigned_at": datetime(2026, 3, 24, 9, 0, tzinfo=timezone.utc),
                    "unassigned_at": None,
                },
                authorization="Bearer token",
            )

        self.assertIn("driver_id", context.exception.details)

