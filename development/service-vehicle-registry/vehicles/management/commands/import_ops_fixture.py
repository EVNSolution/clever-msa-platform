import json
from pathlib import Path
from uuid import NAMESPACE_URL, UUID, uuid5

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_datetime

from vehicles.models import VehicleMaster, VehicleOperatorAccess


def _build_access_id(vehicle_id: UUID) -> UUID:
    return uuid5(NAMESPACE_URL, f"ops-derived-vehicle-access:{vehicle_id}")


class Command(BaseCommand):
    help = "Import the vehicles section from an ops-derived local fixture."

    def add_arguments(self, parser):
        parser.add_argument("--fixture", required=True, help="Absolute path to the fixture JSON file.")

    def handle(self, *args, **options):
        payload = self._load_fixture(options["fixture"])
        vehicles = payload.get("vehicles", [])
        imported = 0

        with transaction.atomic():
            for vehicle_payload in vehicles:
                vehicle, _ = VehicleMaster.objects.update_or_create(
                    vehicle_id=UUID(vehicle_payload["vehicle_id"]),
                    defaults={
                        "manufacturer_company_id": UUID(vehicle_payload["manufacturer_company_id"]),
                        "plate_number": vehicle_payload["plate_number"],
                        "vin": vehicle_payload["vin"],
                        "manufacturer_vehicle_code": vehicle_payload["manufacturer_vehicle_code"],
                        "model_name": vehicle_payload["model_name"],
                        "vehicle_status": vehicle_payload["vehicle_status"],
                    },
                )
                VehicleOperatorAccess.objects.update_or_create(
                    vehicle_operator_access_id=_build_access_id(vehicle.vehicle_id),
                    defaults={
                        "vehicle": vehicle,
                        "operator_company_id": UUID(vehicle_payload["operator_company_id"]),
                        "access_status": VehicleOperatorAccess.AccessStatus.ACTIVE,
                        "started_at": parse_datetime(vehicle_payload["started_at"]),
                        "ended_at": None,
                    },
                )
                imported += 1

        self.stdout.write(
            self.style.SUCCESS(f"Imported ops-derived vehicle fixture ({imported} vehicles).")
        )

    def _load_fixture(self, fixture_path: str) -> dict:
        path = Path(fixture_path)
        if not path.exists():
            raise CommandError(f"Fixture file does not exist: {path}")
        return json.loads(path.read_text())
