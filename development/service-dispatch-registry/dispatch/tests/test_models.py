from datetime import date, datetime, time, timezone
from importlib import import_module
from pathlib import Path
from uuid import UUID, uuid4

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase


def _load_models_module(test_case: TestCase):
    try:
        return import_module("dispatch.models")
    except ModuleNotFoundError as exc:
        test_case.fail(f"dispatch.models module missing: {exc}")


class DispatchModelTests(TestCase):
    def test_initial_migration_file_exists(self):
        migration_path = Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.py"

        self.assertTrue(migration_path.exists())

    def test_dispatch_plan_is_unique_per_fleet_and_date(self):
        models_module = _load_models_module(self)
        models_module.DispatchPlan.objects.create(
            company_id=UUID("30000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            planned_volume=120,
            dispatch_status=models_module.DispatchPlan.DispatchStatus.DRAFT,
        )

        with self.assertRaises(IntegrityError):
            models_module.DispatchPlan.objects.create(
                company_id=UUID("30000000-0000-0000-0000-000000000001"),
                fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
                dispatch_date=date(2026, 3, 24),
                planned_volume=180,
                dispatch_status=models_module.DispatchPlan.DispatchStatus.PUBLISHED,
            )

    def test_vehicle_schedule_is_unique_per_vehicle_date_and_shift_slot(self):
        models_module = _load_models_module(self)
        models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )

        with self.assertRaises(IntegrityError):
            models_module.VehicleSchedule.objects.create(
                vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
                fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
                dispatch_date=date(2026, 3, 24),
                shift_slot="A",
                schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
            )

    def test_dispatch_assignment_rejects_vehicle_mismatch_with_schedule(self):
        models_module = _load_models_module(self)
        schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
        )
        assignment = models_module.DispatchAssignment(
            vehicle_schedule=schedule,
            vehicle_id=UUID("50000000-0000-0000-0000-000000000099"),
            driver_id=uuid4(),
            operator_company_id=uuid4(),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            assignment_status=models_module.DispatchAssignment.AssignmentStatus.ASSIGNED,
            assigned_at=datetime(2026, 3, 24, 9, 0, tzinfo=timezone.utc),
        )

        with self.assertRaises(ValidationError) as context:
            assignment.full_clean()

        self.assertIn("vehicle_id", context.exception.message_dict)

    def test_dispatch_assignment_rejects_non_planned_schedule(self):
        models_module = _load_models_module(self)
        schedule = models_module.VehicleSchedule.objects.create(
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            fleet_id=UUID("40000000-0000-0000-0000-000000000001"),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.BLOCKED,
        )
        assignment = models_module.DispatchAssignment(
            vehicle_schedule=schedule,
            vehicle_id=UUID("50000000-0000-0000-0000-000000000001"),
            driver_id=uuid4(),
            operator_company_id=uuid4(),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            assignment_status=models_module.DispatchAssignment.AssignmentStatus.ASSIGNED,
            assigned_at=datetime(2026, 3, 24, 9, 0, tzinfo=timezone.utc),
        )

        with self.assertRaises(ValidationError) as context:
            assignment.full_clean()

        self.assertIn("vehicle_schedule_id", context.exception.message_dict)

    def test_vehicle_schedule_rejects_end_before_start(self):
        models_module = _load_models_module(self)
        schedule = models_module.VehicleSchedule(
            vehicle_id=uuid4(),
            fleet_id=uuid4(),
            dispatch_date=date(2026, 3, 24),
            shift_slot="A",
            schedule_status=models_module.VehicleSchedule.ScheduleStatus.PLANNED,
            starts_at=time(18, 0),
            ends_at=time(9, 0),
        )

        with self.assertRaises(ValidationError) as context:
            schedule.full_clean()

        self.assertIn("ends_at", context.exception.message_dict)

