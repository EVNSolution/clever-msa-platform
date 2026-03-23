from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from deadletters.models import TelemetryDeadLetter


class Command(BaseCommand):
    help = "Delete dead-letter rows older than the configured retention window."

    def handle(self, *args, **options):
        retention_days = settings.TELEMETRY_DEAD_LETTER_RETENTION_DAYS
        cutoff = timezone.now() - timedelta(days=retention_days)
        deleted_count, _ = TelemetryDeadLetter.objects.filter(failed_at__lt=cutoff).delete()
        self.stdout.write(
            self.style.SUCCESS(
                f"Pruned {deleted_count} dead-letter records older than {retention_days} days."
            )
        )
