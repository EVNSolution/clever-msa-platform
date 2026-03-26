from django.core.management import call_command
from django.test import TestCase

from announcements.models import Announcement


class SeedAnnouncementsCommandTests(TestCase):
    def test_seed_announcements_creates_expected_announcements_idempotently(self) -> None:
        call_command("seed_announcements")
        self.assertEqual(Announcement.objects.count(), 2)

        statuses = {announcement.status for announcement in Announcement.objects.all()}
        scopes = {announcement.exposure_scope for announcement in Announcement.objects.all()}
        self.assertEqual(statuses, {"draft", "published"})
        self.assertEqual(scopes, {"driver", "operator"})

        call_command("seed_announcements")
        self.assertEqual(Announcement.objects.count(), 2)
