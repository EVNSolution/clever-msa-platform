from datetime import date, datetime, timezone
from uuid import UUID

from django.core.management.base import BaseCommand

from dispatch.models import DispatchAssignment, DispatchPlan, VehicleSchedule

SAMPLE_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")
SAMPLE_FLEET_ID = UUID("40000000-0000-0000-0000-000000000001")
SAMPLE_VEHICLE_ID = UUID("50000000-0000-0000-0000-000000000001")
SAMPLE_DRIVER_ID = UUID("10000000-0000-0000-0000-000000000001")
SAMPLE_OPERATOR_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")

SAMPLE_DISPATCH_PLAN_ID = UUID("80000000-0000-0000-0000-000000000001")
SAMPLE_VEHICLE_SCHEDULE_ID = UUID("81000000-0000-0000-0000-000000000001")
SAMPLE_DISPATCH_ASSIGNMENT_ID = UUID("82000000-0000-0000-0000-000000000001")


class Command(BaseCommand):
    help = "Seed deterministic dispatch registry sample data."

    def handle(self, *args, **options):
        DispatchPlan.objects.update_or_create(
            dispatch_plan_id=SAMPLE_DISPATCH_PLAN_ID,
            defaults={
                "company_id": SAMPLE_COMPANY_ID,
                "fleet_id": SAMPLE_FLEET_ID,
                "dispatch_date": date(2026, 3, 24),
                "planned_volume": 120,
                "dispatch_status": DispatchPlan.DispatchStatus.PUBLISHED,
            },
        )
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
        self.stdout.write(self.style.SUCCESS("Dispatch registry seed completed successfully."))
