from datetime import date, datetime, timezone
from uuid import UUID

from django.core.management.base import BaseCommand

from dispatch.models import (
    DispatchAssignment,
    DispatchPlan,
    DispatchUploadBatch,
    DispatchUploadRow,
    VehicleSchedule,
)

SAMPLE_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")
SAMPLE_FLEET_ID = UUID("40000000-0000-0000-0000-000000000001")
SAMPLE_VEHICLE_ID = UUID("50000000-0000-0000-0000-000000000001")
SAMPLE_DRIVER_ID = UUID("10000000-0000-0000-0000-000000000001")
SAMPLE_OPERATOR_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")

SAMPLE_DISPATCH_PLAN_ID = UUID("80000000-0000-0000-0000-000000000001")
SAMPLE_VEHICLE_SCHEDULE_ID = UUID("81000000-0000-0000-0000-000000000001")
SAMPLE_DISPATCH_ASSIGNMENT_ID = UUID("82000000-0000-0000-0000-000000000001")
SAMPLE_UPLOAD_BATCH_ID = UUID("83000000-0000-0000-0000-000000000001")
SAMPLE_UPLOAD_ROW_ID = UUID("83000000-0000-0000-0000-000000000002")


class Command(BaseCommand):
    help = "Seed deterministic dispatch registry sample data."

    def handle(self, *args, **options):
        dispatch_plan = DispatchPlan.objects.update_or_create(
            dispatch_plan_id=SAMPLE_DISPATCH_PLAN_ID,
            defaults={
                "company_id": SAMPLE_COMPANY_ID,
                "fleet_id": SAMPLE_FLEET_ID,
                "dispatch_date": date(2026, 3, 24),
                "planned_volume": 120,
                "dispatch_status": DispatchPlan.DispatchStatus.PUBLISHED,
            },
        )[0]
        VehicleSchedule.objects.update_or_create(
            vehicle_schedule_id=SAMPLE_VEHICLE_SCHEDULE_ID,
            defaults={
                "vehicle_id": SAMPLE_VEHICLE_ID,
                "fleet_id": SAMPLE_FLEET_ID,
                "dispatch_date": date(2026, 3, 24),
                "shift_slot": "A",
                "schedule_status": VehicleSchedule.ScheduleStatus.PLANNED,
            },
        )
        schedule = VehicleSchedule.objects.get(vehicle_schedule_id=SAMPLE_VEHICLE_SCHEDULE_ID)
        DispatchAssignment.objects.update_or_create(
            dispatch_assignment_id=SAMPLE_DISPATCH_ASSIGNMENT_ID,
            defaults={
                "vehicle_schedule": schedule,
                "vehicle_id": SAMPLE_VEHICLE_ID,
                "driver_id": SAMPLE_DRIVER_ID,
                "operator_company_id": SAMPLE_OPERATOR_COMPANY_ID,
                "dispatch_date": date(2026, 3, 24),
                "shift_slot": "A",
                "assignment_status": DispatchAssignment.AssignmentStatus.ASSIGNED,
                "assigned_at": datetime(2026, 3, 24, 9, 0, tzinfo=timezone.utc),
                "unassigned_at": None,
            },
        )
        upload_batch = DispatchUploadBatch.objects.update_or_create(
            upload_batch_id=SAMPLE_UPLOAD_BATCH_ID,
            defaults={
                "dispatch_plan": dispatch_plan,
                "company_id": SAMPLE_COMPANY_ID,
                "fleet_id": SAMPLE_FLEET_ID,
                "dispatch_date": date(2026, 3, 24),
                "source_filename": "seed-dispatch.xlsx",
                "upload_status": DispatchUploadBatch.UploadStatus.CONFIRMED,
            },
        )[0]
        DispatchUploadRow.objects.update_or_create(
            upload_row_id=SAMPLE_UPLOAD_ROW_ID,
            defaults={
                "upload_batch": upload_batch,
                "row_index": 1,
                "external_user_name": "seed-driver-user",
                "small_region_text": "10H2",
                "detailed_region_text": "10H2-가",
                "box_count": 120,
                "household_count": 80,
                "matched_driver_id": SAMPLE_DRIVER_ID,
            },
        )
        self.stdout.write(self.style.SUCCESS("Dispatch registry seed completed successfully."))
