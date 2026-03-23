from datetime import date, datetime, timezone
from importlib import import_module
from unittest.mock import Mock

from django.core.management import call_command
from django.test import TestCase


def _load_models_module(test_case: TestCase):
    try:
        return import_module("dispatch.models")
    except ModuleNotFoundError as exc:
        test_case.fail(f"dispatch.models module missing: {exc}")


def _load_seed_module(test_case: TestCase):
    try:
        return import_module("dispatch.management.commands.seed_dispatch")
    except ModuleNotFoundError as exc:
        test_case.fail(f"seed_dispatch command module missing: {exc}")


class SeedDispatchCommandTests(TestCase):
    def test_seed_command_creates_deterministic_dispatch_data(self):
        models_module = _load_models_module(self)
        seed_module = _load_seed_module(self)

        call_command("seed_dispatch", stdout=Mock())

        plan = models_module.DispatchPlan.objects.get(
            dispatch_plan_id=seed_module.SAMPLE_DISPATCH_PLAN_ID
        )
        schedule = models_module.VehicleSchedule.objects.get(
            vehicle_schedule_id=seed_module.SAMPLE_VEHICLE_SCHEDULE_ID
        )
        assignment = models_module.DispatchAssignment.objects.get(
            dispatch_assignment_id=seed_module.SAMPLE_DISPATCH_ASSIGNMENT_ID
        )

        self.assertEqual(plan.dispatch_date, date(2026, 3, 24))
        self.assertEqual(plan.planned_volume, 120)
        self.assertEqual(schedule.shift_slot, "A")
        self.assertEqual(str(assignment.driver_id), "10000000-0000-0000-0000-000000000001")
        self.assertEqual(
            assignment.assigned_at,
            datetime(2026, 3, 24, 9, 0, tzinfo=timezone.utc),
        )

    def test_seed_command_is_idempotent(self):
        models_module = _load_models_module(self)
        seed_module = _load_seed_module(self)

        call_command("seed_dispatch", stdout=Mock())
        assignment = models_module.DispatchAssignment.objects.get(
            dispatch_assignment_id=seed_module.SAMPLE_DISPATCH_ASSIGNMENT_ID
        )
        assignment.assignment_status = models_module.DispatchAssignment.AssignmentStatus.UNASSIGNED
        assignment.unassigned_at = datetime(2026, 3, 24, 10, 0, tzinfo=timezone.utc)
        assignment.save(update_fields=["assignment_status", "unassigned_at"])

        call_command("seed_dispatch", stdout=Mock())

        self.assertEqual(models_module.DispatchPlan.objects.count(), 1)
        self.assertEqual(models_module.VehicleSchedule.objects.count(), 1)
        self.assertEqual(models_module.DispatchAssignment.objects.count(), 1)

        assignment.refresh_from_db()
        self.assertEqual(
            assignment.assignment_status,
            models_module.DispatchAssignment.AssignmentStatus.ASSIGNED,
        )
        self.assertIsNone(assignment.unassigned_at)

