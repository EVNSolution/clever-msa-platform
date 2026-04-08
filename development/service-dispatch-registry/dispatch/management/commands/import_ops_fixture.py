import json
from pathlib import Path
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_date, parse_datetime, parse_time

from dispatch.models import DispatchAssignment, DispatchPlan, VehicleSchedule


class Command(BaseCommand):
    help = "Import the dispatch section from an ops-derived local fixture."

    def add_arguments(self, parser):
        parser.add_argument("--fixture", required=True, help="Absolute path to the fixture JSON file.")

    def handle(self, *args, **options):
        payload = self._load_fixture(options["fixture"])
        dispatch_payload = payload.get("dispatch", {})
        imported_plans = 0
        imported_schedules = 0
        imported_assignments = 0

        with transaction.atomic():
            for plan_payload in dispatch_payload.get("plans", []):
                DispatchPlan.objects.update_or_create(
                    dispatch_plan_id=UUID(plan_payload["dispatch_plan_id"]),
                    defaults={
                        "company_id": UUID(plan_payload["company_id"]),
                        "fleet_id": UUID(plan_payload["fleet_id"]),
                        "dispatch_date": parse_date(plan_payload["dispatch_date"]),
                        "planned_volume": plan_payload["planned_volume"],
                        "dispatch_status": plan_payload["dispatch_status"],
                    },
                )
                imported_plans += 1

            schedules_by_id = {}
            for schedule_payload in dispatch_payload.get("schedules", []):
                schedule, _ = VehicleSchedule.objects.update_or_create(
                    vehicle_schedule_id=UUID(schedule_payload["vehicle_schedule_id"]),
                    defaults={
                        "vehicle_id": UUID(schedule_payload["vehicle_id"]),
                        "fleet_id": UUID(schedule_payload["fleet_id"]),
                        "dispatch_date": parse_date(schedule_payload["dispatch_date"]),
                        "shift_slot": schedule_payload["shift_slot"],
                        "schedule_status": schedule_payload["schedule_status"],
                        "starts_at": parse_time(schedule_payload["starts_at"]),
                        "ends_at": parse_time(schedule_payload["ends_at"]),
                    },
                )
                schedules_by_id[str(schedule.vehicle_schedule_id)] = schedule
                imported_schedules += 1

            for assignment_payload in dispatch_payload.get("assignments", []):
                schedule = schedules_by_id[assignment_payload["vehicle_schedule_id"]]
                DispatchAssignment.objects.update_or_create(
                    dispatch_assignment_id=UUID(assignment_payload["dispatch_assignment_id"]),
                    defaults={
                        "vehicle_schedule": schedule,
                        "vehicle_id": UUID(assignment_payload["vehicle_id"]),
                        "driver_id": UUID(assignment_payload["driver_id"])
                        if assignment_payload.get("driver_id")
                        else None,
                        "outsourced_driver_id": (
                            UUID(assignment_payload["outsourced_driver_id"])
                            if assignment_payload.get("outsourced_driver_id")
                            else None
                        ),
                        "operator_company_id": UUID(assignment_payload["operator_company_id"]),
                        "dispatch_date": parse_date(assignment_payload["dispatch_date"]),
                        "shift_slot": assignment_payload["shift_slot"],
                        "assignment_status": assignment_payload["assignment_status"],
                        "assigned_at": parse_datetime(assignment_payload["assigned_at"]),
                        "unassigned_at": (
                            parse_datetime(assignment_payload["unassigned_at"])
                            if assignment_payload.get("unassigned_at")
                            else None
                        ),
                    },
                )
                imported_assignments += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Imported ops-derived dispatch fixture "
                f"({imported_plans} plans, {imported_schedules} schedules, {imported_assignments} assignments)."
            )
        )

    def _load_fixture(self, fixture_path: str) -> dict:
        path = Path(fixture_path)
        if not path.exists():
            raise CommandError(f"Fixture file does not exist: {path}")
        return json.loads(path.read_text())
