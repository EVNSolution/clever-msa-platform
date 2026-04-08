import json
import tempfile
from pathlib import Path
from unittest.mock import Mock
from uuid import uuid4

from django.core.management import call_command
from django.test import TestCase

from settlements.models import SettlementItem, SettlementRun


class ImportOpsFixtureCommandTests(TestCase):
    def test_command_imports_settlement_runs_and_items(self):
        settlement_run_id = str(uuid4())
        payload = {
            "settlements": {
                "runs": [
                    {
                        "settlement_run_id": settlement_run_id,
                        "company_id": str(uuid4()),
                        "fleet_id": str(uuid4()),
                        "period_start": "2026-03-01",
                        "period_end": "2026-03-31",
                        "status": "calculated",
                    }
                ],
                "items": [
                    {
                        "settlement_item_id": str(uuid4()),
                        "settlement_run_id": settlement_run_id,
                        "driver_id": str(uuid4()),
                        "amount": "125000.00",
                        "payout_status": "pending",
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

        self.assertEqual(SettlementRun.objects.count(), 1)
        self.assertEqual(SettlementItem.objects.count(), 1)
