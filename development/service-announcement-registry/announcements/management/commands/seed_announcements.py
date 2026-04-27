from datetime import datetime, timezone
from uuid import UUID

from django.core.management.base import BaseCommand

from announcements.models import Announcement

PUBLISHED_ANNOUNCEMENT_ID = UUID("92000000-0000-0000-0000-000000000001")
DRAFT_ANNOUNCEMENT_ID = UUID("92000000-0000-0000-0000-000000000002")


class Command(BaseCommand):
    help = "Seed deterministic announcement registry bootstrap data."

    def handle(self, *args, **options):
        Announcement.objects.update_or_create(
            announcement_id=PUBLISHED_ANNOUNCEMENT_ID,
            defaults={
                "slug": "ops-policy-update",
                "title": "Policy Update For Operators",
                "body": "Settlement review timing changed for operator workflow.",
                "status": Announcement.Status.PUBLISHED,
                "exposure_scope": Announcement.ExposureScope.OPERATOR,
                "published_at": datetime(2026, 3, 1, 0, 0, tzinfo=timezone.utc),
                "expires_at": datetime(2026, 4, 1, 0, 0, tzinfo=timezone.utc),
                "is_pinned": True,
                "display_order": 10,
            },
        )
        Announcement.objects.update_or_create(
            announcement_id=DRAFT_ANNOUNCEMENT_ID,
            defaults={
                "slug": "driver-app-maintenance",
                "title": "Driver App Maintenance Notice",
                "body": "Driver-facing maintenance announcement draft.",
                "status": Announcement.Status.DRAFT,
                "exposure_scope": Announcement.ExposureScope.DRIVER,
                "published_at": None,
                "expires_at": None,
                "is_pinned": False,
                "display_order": 20,
            },
        )
        self.stdout.write(self.style.SUCCESS("Seeded announcement registry bootstrap data."))
