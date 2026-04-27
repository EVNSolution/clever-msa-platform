import json
import tempfile
from pathlib import Path
from unittest.mock import Mock
from uuid import uuid4

from django.core.management import call_command
from django.test import TestCase

from assignments.models import DriverVehicleAssignment


class ImportOpsFixtureCommandTests(TestCase):
    def test_command_imports_assignments_idempotently(self):
        payload = {
            "assignments": [
                {
                    "driver_vehicle_assignment_id": str(uuid4()),
                    "driver_id": str(uuid4()),
                    "vehicle_id": str(uuid4()),
                    "operator_company_id": str(uuid4()),
                    "assignment_status": "assigned",
                    "assigned_at": "2026-03-30T08:00:00Z",
                    "unassigned_at": None,
                }
            ]
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tmp:
            Path(tmp.name).write_text(json.dumps(payload))
            fixture_path = tmp.name
        self.addCleanup(Path(fixture_path).unlink, missing_ok=True)

        call_command("import_ops_fixture", "--fixture", fixture_path, stdout=Mock())
        call_command("import_ops_fixture", "--fixture", fixture_path, stdout=Mock())

        self.assertEqual(DriverVehicleAssignment.objects.count(), 1)
