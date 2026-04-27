from datetime import datetime, timezone
from uuid import UUID

from django.core.management.base import BaseCommand

from assignments.models import DriverVehicleAssignment


SAMPLE_ASSIGNMENT_ID = UUID("60000000-0000-0000-0000-000000000001")
SAMPLE_DRIVER_ID = UUID("10000000-0000-0000-0000-000000000001")
SAMPLE_VEHICLE_ID = UUID("50000000-0000-0000-0000-000000000001")
SAMPLE_OPERATOR_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")
SAMPLE_ASSIGNED_AT = datetime(2026, 1, 2, tzinfo=timezone.utc)


class Command(BaseCommand):
    help = "Create or update seeded driver vehicle assignments."

    def handle(self, *args, **options):
        DriverVehicleAssignment.objects.update_or_create(
            driver_vehicle_assignment_id=SAMPLE_ASSIGNMENT_ID,
            defaults={
                "driver_id": SAMPLE_DRIVER_ID,
                "vehicle_id": SAMPLE_VEHICLE_ID,
                "operator_company_id": SAMPLE_OPERATOR_COMPANY_ID,
                "assignment_status": DriverVehicleAssignment.AssignmentStatus.ASSIGNED,
                "assigned_at": SAMPLE_ASSIGNED_AT,
                "unassigned_at": None,
            },
        )
        self.stdout.write(self.style.SUCCESS("Seeded driver vehicle assignments."))
