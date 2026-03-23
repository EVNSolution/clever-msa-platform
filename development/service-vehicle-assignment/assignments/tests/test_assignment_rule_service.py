from datetime import datetime, timezone
from importlib import import_module
from uuid import UUID, uuid4

from django.test import TestCase

from assignments.models import DriverVehicleAssignment


def _load_rule_module(test_case: TestCase):
    try:
        return import_module("assignments.services.assignment_rule_service")
    except ModuleNotFoundError as exc:
        test_case.fail(f"assignment_rule_service module missing: {exc}")


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
        self.calls = []

    def get_vehicle(self, *, vehicle_id: str, authorization: str):
        self.calls.append(("get_vehicle", vehicle_id, authorization))
        if self.vehicle_missing:
            source_clients = import_module("assignments.services.source_clients")
            raise source_clients.SourceNotFoundError(vehicle_id)
        return self.vehicle

    def list_vehicle_operator_accesses(
        self, *, vehicle_id: str, access_status: str, authorization: str
    ):
        self.calls.append(
            ("list_vehicle_operator_accesses", vehicle_id, access_status, authorization)
        )
        return self.operator_accesses

    def get_driver(self, *, driver_id: str, authorization: str):
        self.calls.append(("get_driver", driver_id, authorization))
        if self.driver_missing:
            source_clients = import_module("assignments.services.source_clients")
            raise source_clients.SourceNotFoundError(driver_id)
        return self.driver


class AssignmentRuleServiceTests(TestCase):
    def test_rejects_missing_vehicle(self):
        rule_module = _load_rule_module(self)
        service = rule_module.AssignmentRuleService(
            source_clients=StubSourceClients(vehicle_missing=True)
        )

        with self.assertRaises(rule_module.AssignmentRuleViolation) as context:
            service.validate_and_normalize(
                attributes={
                    "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                    "vehicle_id": UUID("50000000-0000-0000-0000-000000000001"),
                    "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                    "assignment_status": "assigned",
                    "assigned_at": datetime(2026, 3, 20, tzinfo=timezone.utc),
                    "unassigned_at": None,
                },
                authorization="Bearer token",
            )

        self.assertIn("vehicle_id", context.exception.details)

    def test_rejects_inactive_vehicle(self):
        rule_module = _load_rule_module(self)
        service = rule_module.AssignmentRuleService(
            source_clients=StubSourceClients(
                vehicle={
                    "vehicle_id": "50000000-0000-0000-0000-000000000001",
                    "vehicle_status": "inactive",
                }
            )
        )

        with self.assertRaises(rule_module.AssignmentRuleViolation) as context:
            service.validate_and_normalize(
                attributes={
                    "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                    "vehicle_id": UUID("50000000-0000-0000-0000-000000000001"),
                    "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                    "assignment_status": "assigned",
                    "assigned_at": datetime(2026, 3, 20, tzinfo=timezone.utc),
                    "unassigned_at": None,
                },
                authorization="Bearer token",
            )

        self.assertIn("vehicle_id", context.exception.details)

    def test_rejects_missing_active_operator_access(self):
        rule_module = _load_rule_module(self)
        service = rule_module.AssignmentRuleService(
            source_clients=StubSourceClients(
                vehicle={
                    "vehicle_id": "50000000-0000-0000-0000-000000000001",
                    "vehicle_status": "active",
                },
                operator_accesses=[],
            )
        )

        with self.assertRaises(rule_module.AssignmentRuleViolation) as context:
            service.validate_and_normalize(
                attributes={
                    "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                    "vehicle_id": UUID("50000000-0000-0000-0000-000000000001"),
                    "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                    "assignment_status": "assigned",
                    "assigned_at": datetime(2026, 3, 20, tzinfo=timezone.utc),
                    "unassigned_at": None,
                },
                authorization="Bearer token",
            )

        self.assertIn("operator_company_id", context.exception.details)

    def test_rejects_missing_driver(self):
        rule_module = _load_rule_module(self)
        service = rule_module.AssignmentRuleService(
            source_clients=StubSourceClients(
                vehicle={
                    "vehicle_id": "50000000-0000-0000-0000-000000000001",
                    "vehicle_status": "active",
                },
                operator_accesses=[
                    {
                        "vehicle_operator_access_id": "51000000-0000-0000-0000-000000000001",
                        "operator_company_id": "30000000-0000-0000-0000-000000000001",
                        "access_status": "active",
                    }
                ],
                driver_missing=True,
            )
        )

        with self.assertRaises(rule_module.AssignmentRuleViolation) as context:
            service.validate_and_normalize(
                attributes={
                    "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                    "vehicle_id": UUID("50000000-0000-0000-0000-000000000001"),
                    "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                    "assignment_status": "assigned",
                    "assigned_at": datetime(2026, 3, 20, tzinfo=timezone.utc),
                    "unassigned_at": None,
                },
                authorization="Bearer token",
            )

        self.assertIn("driver_id", context.exception.details)

    def test_rejects_driver_company_mismatch(self):
        rule_module = _load_rule_module(self)
        service = rule_module.AssignmentRuleService(
            source_clients=StubSourceClients(
                vehicle={
                    "vehicle_id": "50000000-0000-0000-0000-000000000001",
                    "vehicle_status": "active",
                },
                operator_accesses=[
                    {
                        "vehicle_operator_access_id": "51000000-0000-0000-0000-000000000001",
                        "operator_company_id": "30000000-0000-0000-0000-000000000001",
                        "access_status": "active",
                    }
                ],
                driver={
                    "driver_id": "10000000-0000-0000-0000-000000000001",
                    "company_id": "30000000-0000-0000-0000-000000000002",
                },
            )
        )

        with self.assertRaises(rule_module.AssignmentRuleViolation) as context:
            service.validate_and_normalize(
                attributes={
                    "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                    "vehicle_id": UUID("50000000-0000-0000-0000-000000000001"),
                    "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                    "assignment_status": "assigned",
                    "assigned_at": datetime(2026, 3, 20, tzinfo=timezone.utc),
                    "unassigned_at": None,
                },
                authorization="Bearer token",
            )

        self.assertIn("driver_id", context.exception.details)

    def test_rejects_second_assigned_record_for_same_vehicle(self):
        rule_module = _load_rule_module(self)
        DriverVehicleAssignment.objects.create(
            driver_id=uuid4(),
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            operator_company_id=UUID("30000000-0000-0000-0000-000000000001"),
            assignment_status="assigned",
            assigned_at=datetime(2026, 3, 20, tzinfo=timezone.utc),
            unassigned_at=None,
        )
        service = rule_module.AssignmentRuleService(
            source_clients=StubSourceClients(
                vehicle={
                    "vehicle_id": "50000000-0000-0000-0000-000000000001",
                    "vehicle_status": "active",
                },
                operator_accesses=[
                    {
                        "vehicle_operator_access_id": "51000000-0000-0000-0000-000000000001",
                        "operator_company_id": "30000000-0000-0000-0000-000000000001",
                        "access_status": "active",
                    }
                ],
                driver={
                    "driver_id": "10000000-0000-0000-0000-000000000001",
                    "company_id": "30000000-0000-0000-0000-000000000001",
                },
            )
        )

        with self.assertRaises(rule_module.AssignmentRuleViolation) as context:
            service.validate_and_normalize(
                attributes={
                    "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                    "vehicle_id": UUID("50000000-0000-0000-0000-000000000001"),
                    "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                    "assignment_status": "assigned",
                    "assigned_at": datetime(2026, 3, 21, tzinfo=timezone.utc),
                    "unassigned_at": None,
                },
                authorization="Bearer token",
            )

        self.assertIn("vehicle_id", context.exception.details)

    def test_unassigned_status_sets_missing_unassigned_at(self):
        rule_module = _load_rule_module(self)
        service = rule_module.AssignmentRuleService(source_clients=StubSourceClients())

        normalized = service.validate_and_normalize(
            attributes={
                "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                "vehicle_id": UUID("50000000-0000-0000-0000-000000000001"),
                "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                "assignment_status": "unassigned",
                "assigned_at": datetime(2026, 3, 20, tzinfo=timezone.utc),
                "unassigned_at": None,
            },
            authorization="Bearer token",
        )

        self.assertIsNotNone(normalized["unassigned_at"])

    def test_assigned_status_clears_unassigned_at(self):
        rule_module = _load_rule_module(self)
        stub = StubSourceClients(
            vehicle={
                "vehicle_id": "50000000-0000-0000-0000-000000000001",
                "vehicle_status": "active",
            },
            operator_accesses=[
                {
                    "vehicle_operator_access_id": "51000000-0000-0000-0000-000000000001",
                    "operator_company_id": "30000000-0000-0000-0000-000000000001",
                    "access_status": "active",
                }
            ],
            driver={
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "company_id": "30000000-0000-0000-0000-000000000001",
            },
        )
        service = rule_module.AssignmentRuleService(source_clients=stub)

        normalized = service.validate_and_normalize(
            attributes={
                "driver_id": UUID("10000000-0000-0000-0000-000000000001"),
                "vehicle_id": UUID("50000000-0000-0000-0000-000000000001"),
                "operator_company_id": UUID("30000000-0000-0000-0000-000000000001"),
                "assignment_status": "assigned",
                "assigned_at": datetime(2026, 3, 20, tzinfo=timezone.utc),
                "unassigned_at": datetime(2026, 3, 21, tzinfo=timezone.utc),
            },
            authorization="Bearer token",
        )

        self.assertIsNone(normalized["unassigned_at"])
        self.assertEqual(
            stub.calls,
            [
                (
                    "get_vehicle",
                    "50000000-0000-0000-0000-000000000001",
                    "Bearer token",
                ),
                (
                    "list_vehicle_operator_accesses",
                    "50000000-0000-0000-0000-000000000001",
                    "active",
                    "Bearer token",
                ),
                (
                    "get_driver",
                    "10000000-0000-0000-0000-000000000001",
                    "Bearer token",
                ),
            ],
        )
