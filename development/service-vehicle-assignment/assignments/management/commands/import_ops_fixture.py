import json
from pathlib import Path
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_datetime

from assignments.models import DriverVehicleAssignment


class Command(BaseCommand):
    help = "Import the driver-vehicle assignment section from an ops-derived local fixture."

    def add_arguments(self, parser):
        parser.add_argument("--fixture", required=True, help="Absolute path to the fixture JSON file.")

    def handle(self, *args, **options):
        payload = self._load_fixture(options["fixture"])
        assignments = payload.get("assignments", [])
        imported = 0

        with transaction.atomic():
            for assignment_payload in assignments:
                DriverVehicleAssignment.objects.update_or_create(
                    driver_vehicle_assignment_id=UUID(
                        assignment_payload["driver_vehicle_assignment_id"]
                    ),
                    defaults={
                        "driver_id": UUID(assignment_payload["driver_id"]),
                        "vehicle_id": UUID(assignment_payload["vehicle_id"]),
                        "operator_company_id": UUID(assignment_payload["operator_company_id"]),
                        "assignment_status": assignment_payload["assignment_status"],
                        "assigned_at": parse_datetime(assignment_payload["assigned_at"]),
                        "unassigned_at": (
                            parse_datetime(assignment_payload["unassigned_at"])
                            if assignment_payload.get("unassigned_at")
                            else None
                        ),
                    },
                )
                imported += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported ops-derived assignment fixture ({imported} assignments)."
            )
        )

    def _load_fixture(self, fixture_path: str) -> dict:
        path = Path(fixture_path)
        if not path.exists():
            raise CommandError(f"Fixture file does not exist: {path}")
        return json.loads(path.read_text())
