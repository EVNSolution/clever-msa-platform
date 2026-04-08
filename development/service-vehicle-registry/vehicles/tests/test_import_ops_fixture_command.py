import json
import tempfile
from pathlib import Path
from unittest.mock import Mock
from uuid import uuid4

from django.core.management import call_command
from django.test import TestCase

from vehicles.models import VehicleMaster, VehicleOperatorAccess


class ImportOpsFixtureCommandTests(TestCase):
    def test_command_imports_vehicles_and_operator_accesses(self):
        payload = {
            "vehicles": [
                {
                    "vehicle_id": str(uuid4()),
                    "manufacturer_company_id": str(uuid4()),
                    "operator_company_id": str(uuid4()),
                    "plate_number": "12가3401",
                    "vin": "OPSVIN01010001",
                    "manufacturer_vehicle_code": "OPS-MODEL-0101",
                    "model_name": "Ops Cargo Van",
                    "vehicle_status": "active",
                    "started_at": "2026-01-06T00:00:00Z",
                }
            ]
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tmp:
            Path(tmp.name).write_text(json.dumps(payload))
            fixture_path = tmp.name
        self.addCleanup(Path(fixture_path).unlink, missing_ok=True)

        call_command("import_ops_fixture", "--fixture", fixture_path, stdout=Mock())
        call_command("import_ops_fixture", "--fixture", fixture_path, stdout=Mock())

        self.assertEqual(VehicleMaster.objects.count(), 1)
        self.assertEqual(VehicleOperatorAccess.objects.count(), 1)
