import json
from pathlib import Path
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_date

from settlements.models import SettlementItem, SettlementRun


class Command(BaseCommand):
    help = "Import the settlements section from an ops-derived local fixture."

    def add_arguments(self, parser):
        parser.add_argument("--fixture", required=True, help="Absolute path to the fixture JSON file.")

    def handle(self, *args, **options):
        payload = self._load_fixture(options["fixture"])
        settlement_payload = payload.get("settlements", {})
        imported_runs = 0
        imported_items = 0

        with transaction.atomic():
            for run_payload in settlement_payload.get("runs", []):
                SettlementRun.objects.update_or_create(
                    settlement_run_id=UUID(run_payload["settlement_run_id"]),
                    defaults={
                        "company_id": UUID(run_payload["company_id"]),
                        "fleet_id": UUID(run_payload["fleet_id"]),
                        "period_start": parse_date(run_payload["period_start"]),
                        "period_end": parse_date(run_payload["period_end"]),
                        "status": run_payload["status"],
                    },
                )
                imported_runs += 1

            for item_payload in settlement_payload.get("items", []):
                SettlementItem.objects.update_or_create(
                    settlement_item_id=UUID(item_payload["settlement_item_id"]),
                    defaults={
                        "settlement_run_id": UUID(item_payload["settlement_run_id"]),
                        "driver_id": UUID(item_payload["driver_id"]),
                        "amount": item_payload["amount"],
                        "payout_status": item_payload["payout_status"],
                    },
                )
                imported_items += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported ops-derived settlement fixture ({imported_runs} runs, {imported_items} items)."
            )
        )

    def _load_fixture(self, fixture_path: str) -> dict:
        path = Path(fixture_path)
        if not path.exists():
            raise CommandError(f"Fixture file does not exist: {path}")
        return json.loads(path.read_text())
