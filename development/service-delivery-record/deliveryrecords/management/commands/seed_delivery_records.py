from datetime import date
from decimal import Decimal
from uuid import UUID

from django.core.management.base import BaseCommand

from deliveryrecords.models import DailyDeliveryInputSnapshot, DeliveryRecord

SAMPLE_DELIVERY_RECORD_ID = UUID("84000000-0000-0000-0000-000000000001")
SAMPLE_DAILY_SNAPSHOT_ID = UUID("84000000-0000-0000-0000-000000000002")
SAMPLE_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")
SAMPLE_FLEET_ID = UUID("40000000-0000-0000-0000-000000000001")
SAMPLE_DRIVER_ID = UUID("10000000-0000-0000-0000-000000000001")
SAMPLE_SERVICE_DATE = date(2026, 3, 24)


class Command(BaseCommand):
    help = "Seed deterministic delivery record bootstrap data."

    def handle(self, *args, **options):
        DeliveryRecord.objects.update_or_create(
            delivery_record_id=SAMPLE_DELIVERY_RECORD_ID,
            defaults={
                "company_id": SAMPLE_COMPANY_ID,
                "fleet_id": SAMPLE_FLEET_ID,
                "driver_id": SAMPLE_DRIVER_ID,
                "service_date": SAMPLE_SERVICE_DATE,
                "source_reference": "seed-record-001",
                "delivery_count": 8,
                "distance_km": Decimal("18.40"),
                "base_amount": Decimal("72000.00"),
                "status": DeliveryRecord.Status.CONFIRMED,
                "payload": {
                    "source": "bootstrap",
                    "note": "Seed delivery record for local stack.",
                },
            },
        )
        DailyDeliveryInputSnapshot.objects.update_or_create(
            daily_delivery_input_snapshot_id=SAMPLE_DAILY_SNAPSHOT_ID,
            defaults={
                "company_id": SAMPLE_COMPANY_ID,
                "fleet_id": SAMPLE_FLEET_ID,
                "driver_id": SAMPLE_DRIVER_ID,
                "service_date": SAMPLE_SERVICE_DATE,
                "delivery_count": 8,
                "total_distance_km": Decimal("18.40"),
                "total_base_amount": Decimal("72000.00"),
                "source_record_count": 1,
                "status": DailyDeliveryInputSnapshot.Status.ACTIVE,
            },
        )
        self.stdout.write(self.style.SUCCESS("Seeded delivery record bootstrap data."))
