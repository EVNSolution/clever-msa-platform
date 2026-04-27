import json
import tempfile
from pathlib import Path
from unittest.mock import Mock
from uuid import uuid4

from django.core.management import call_command
from django.test import TestCase

from organizations.models import Company, Fleet


class ImportOpsFixtureCommandTests(TestCase):
    def test_command_imports_companies_and_fleets_idempotently(self):
        payload = {
            "organizations": [
                {
                    "company_id": str(uuid4()),
                    "name": "Ops Company A",
                    "fleets": [{"fleet_id": str(uuid4()), "name": "Ops Fleet A-1"}],
                }
            ]
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tmp:
            Path(tmp.name).write_text(json.dumps(payload))
            fixture_path = tmp.name
        self.addCleanup(Path(fixture_path).unlink, missing_ok=True)

        call_command("import_ops_fixture", "--fixture", fixture_path, stdout=Mock())
        call_command("import_ops_fixture", "--fixture", fixture_path, stdout=Mock())

        self.assertEqual(Company.objects.count(), 1)
        self.assertEqual(Fleet.objects.count(), 1)
