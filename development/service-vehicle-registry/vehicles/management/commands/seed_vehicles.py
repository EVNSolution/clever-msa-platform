from datetime import datetime, timezone
from uuid import UUID

from django.core.management.base import BaseCommand

from vehicles.models import VehicleMaster, VehicleOperatorAccess


SAMPLE_VEHICLE_ID = UUID("50000000-0000-0000-0000-000000000001")
SAMPLE_MANUFACTURER_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")
SAMPLE_OPERATOR_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")
SAMPLE_OPERATOR_ACCESS_ID = UUID("51000000-0000-0000-0000-000000000001")
SAMPLE_STARTED_AT = datetime(2026, 1, 1, tzinfo=timezone.utc)


class Command(BaseCommand):
    help = "Create or update seeded vehicle asset data."

    def handle(self, *args, **options):
        vehicle, _ = VehicleMaster.objects.update_or_create(
            vehicle_id=SAMPLE_VEHICLE_ID,
            defaults={
                "manufacturer_company_id": SAMPLE_MANUFACTURER_COMPANY_ID,
                "plate_number": "12가3456",
                "vin": "VIN-000000000000001",
                "manufacturer_vehicle_code": "MODEL-0001",
                "model_name": "Cargo Van",
                "vehicle_status": VehicleMaster.VehicleStatus.ACTIVE,
            },
        )
        VehicleOperatorAccess.objects.update_or_create(
            vehicle_operator_access_id=SAMPLE_OPERATOR_ACCESS_ID,
            defaults={
                "vehicle": vehicle,
                "operator_company_id": SAMPLE_OPERATOR_COMPANY_ID,
                "access_status": VehicleOperatorAccess.AccessStatus.ACTIVE,
                "started_at": SAMPLE_STARTED_AT,
                "ended_at": None,
            },
        )
        self.stdout.write(self.style.SUCCESS("Seeded vehicle asset data."))
