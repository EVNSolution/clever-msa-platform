from datetime import datetime, timedelta, timezone

from django.core.exceptions import ValidationError
from django.test import TestCase

from announcements.models import Announcement


def _published_at() -> datetime:
    return datetime(2026, 3, 1, 0, 0, tzinfo=timezone.utc)


class AnnouncementModelTests(TestCase):
    def test_published_announcement_requires_published_at(self) -> None:
        announcement = Announcement(
            slug="ops-update",
            title="Ops Update",
            body="Body",
            status=Announcement.Status.PUBLISHED,
            exposure_scope=Announcement.ExposureScope.OPERATOR,
        )

        with self.assertRaises(ValidationError):
            announcement.full_clean()

    def test_expires_at_must_be_later_than_published_at(self) -> None:
        announcement = Announcement(
            slug="ops-expire",
            title="Ops Expire",
            body="Body",
            status=Announcement.Status.PUBLISHED,
            exposure_scope=Announcement.ExposureScope.ALL,
            published_at=_published_at(),
            expires_at=_published_at() - timedelta(minutes=1),
        )

        with self.assertRaises(ValidationError):
            announcement.full_clean()

    def test_slug_is_unique(self) -> None:
        Announcement.objects.create(
            slug="ops-dup",
            title="Ops Dup",
            body="Body",
            status=Announcement.Status.DRAFT,
            exposure_scope=Announcement.ExposureScope.ALL,
        )
        duplicate = Announcement(
            slug="ops-dup",
            title="Ops Dup 2",
            body="Body",
            status=Announcement.Status.DRAFT,
            exposure_scope=Announcement.ExposureScope.DRIVER,
        )

        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_draft_announcement_without_published_at_is_valid(self) -> None:
        announcement = Announcement(
            slug="driver-maintenance",
            title="Driver Maintenance",
            body="Body",
            status=Announcement.Status.DRAFT,
            exposure_scope=Announcement.ExposureScope.DRIVER,
        )

        announcement.full_clean()
