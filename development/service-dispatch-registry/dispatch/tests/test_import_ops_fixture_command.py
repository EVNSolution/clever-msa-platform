import json
import tempfile
from pathlib import Path
from unittest.mock import Mock
from uuid import uuid4

from django.core.management import call_command
from django.test import TestCase

from dispatch.models import DispatchAssignment, DispatchPlan, VehicleSchedule


class ImportOpsFixtureCommandTests(TestCase):
    def test_command_imports_dispatch_sections_idempotently(self):
        vehicle_schedule_id = str(uuid4())
        payload = {
            "dispatch": {
                "plans": [
                    {
                        "dispatch_plan_id": str(uuid4()),
                        "company_id": str(uuid4()),
                        "fleet_id": str(uuid4()),
                        "dispatch_date": "2026-03-30",
                        "planned_volume": 48,
                        "dispatch_status": "published",
                    }
                ],
                "schedules": [
                    {
                        "vehicle_schedule_id": vehicle_schedule_id,
                        "vehicle_id": str(uuid4()),
                        "fleet_id": str(uuid4()),
                        "dispatch_date": "2026-03-30",
                        "shift_slot": "A",
                        "schedule_status": "planned",
                        "starts_at": "08:00:00",
                        "ends_at": "18:00:00",
                    }
                ],
                "assignments": [
                    {
                        "dispatch_assignment_id": str(uuid4()),
                        "vehicle_schedule_id": vehicle_schedule_id,
                        "vehicle_id": str(uuid4()),
                        "driver_id": str(uuid4()),
                        "operator_company_id": str(uuid4()),
                        "dispatch_date": "2026-03-30",
                        "shift_slot": "A",
                        "assignment_status": "assigned",
                        "assigned_at": "2026-03-30T08:00:00Z",
                        "unassigned_at": None,
                    }
                ],
            }
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tmp:
            Path(tmp.name).write_text(json.dumps(payload))
            fixture_path = tmp.name
        self.addCleanup(Path(fixture_path).unlink, missing_ok=True)

        call_command("import_ops_fixture", "--fixture", fixture_path, stdout=Mock())
        call_command("import_ops_fixture", "--fixture", fixture_path, stdout=Mock())

        self.assertEqual(DispatchPlan.objects.count(), 1)
        self.assertEqual(VehicleSchedule.objects.count(), 1)
        self.assertEqual(DispatchAssignment.objects.count(), 1)
