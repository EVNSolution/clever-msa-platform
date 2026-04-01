from datetime import datetime, timezone
from importlib import import_module
from unittest.mock import Mock

from django.core.management import call_command
from django.test import TestCase

from assignments.models import DriverVehicleAssignment


def _load_seed_module(test_case: TestCase):
    try:
        return import_module("assignments.management.commands.seed_assignments")
    except ModuleNotFoundError as exc:
        test_case.fail(f"seed_assignments command module missing: {exc}")


class SeedAssignmentsCommandTests(TestCase):
    def test_seed_command_creates_deterministic_assignment(self):
        seed_module = _load_seed_module(self)

        call_command("seed_assignments", stdout=Mock())

        self.assertEqual(DriverVehicleAssignment.objects.count(), 1)
        assignment = DriverVehicleAssignment.objects.get(
            driver_vehicle_assignment_id=seed_module.SAMPLE_ASSIGNMENT_ID
        )
        self.assertEqual(
            str(assignment.driver_id),
            "10000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(
            str(assignment.vehicle_id),
            "50000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(
            str(assignment.operator_company_id),
            "30000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(assignment.assignment_status, "assigned")
        self.assertEqual(assignment.route_no, 1)
        self.assertEqual(
            assignment.assigned_at,
            datetime(2026, 1, 2, tzinfo=timezone.utc),
        )
        self.assertIsNone(assignment.unassigned_at)

    def test_seed_command_is_idempotent(self):
        seed_module = _load_seed_module(self)

        call_command("seed_assignments", stdout=Mock())
        assignment = DriverVehicleAssignment.objects.get(
            driver_vehicle_assignment_id=seed_module.SAMPLE_ASSIGNMENT_ID
        )
        assignment.assignment_status = "unassigned"
        assignment.unassigned_at = datetime(2026, 2, 1, tzinfo=timezone.utc)
        assignment.save(update_fields=["assignment_status", "unassigned_at"])

        call_command("seed_assignments", stdout=Mock())

        self.assertEqual(DriverVehicleAssignment.objects.count(), 1)
        assignment.refresh_from_db()
        self.assertEqual(assignment.assignment_status, "assigned")
        self.assertIsNone(assignment.unassigned_at)

    def test_seed_command_uses_aligned_seed_constants(self):
        seed_module = _load_seed_module(self)
        self.assertEqual(
            str(seed_module.SAMPLE_OPERATOR_COMPANY_ID),
            "30000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(
            str(seed_module.SAMPLE_DRIVER_ID),
            "10000000-0000-0000-0000-000000000001",
        )
        self.assertEqual(
            str(seed_module.SAMPLE_VEHICLE_ID),
            "50000000-0000-0000-0000-000000000001",
        )
