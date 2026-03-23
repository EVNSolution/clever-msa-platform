from datetime import datetime, timezone
from uuid import UUID

from django.core.management.base import BaseCommand

from terminals.models import TerminalInstallation, TerminalRegistry


SAMPLE_TERMINAL_ID = UUID("70000000-0000-0000-0000-000000000001")
SAMPLE_INSTALLATION_ID = UUID("71000000-0000-0000-0000-000000000001")
SAMPLE_MANUFACTURER_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")
SAMPLE_VEHICLE_ID = UUID("50000000-0000-0000-0000-000000000001")
SAMPLE_INSTALLED_AT = datetime(2026, 1, 1, tzinfo=timezone.utc)


class Command(BaseCommand):
    help = "Create or update seeded terminal registry data."

    def handle(self, *args, **options):
        terminal, _ = TerminalRegistry.objects.update_or_create(
            terminal_id=SAMPLE_TERMINAL_ID,
            defaults={
                "manufacturer_company_id": SAMPLE_MANUFACTURER_COMPANY_ID,
                "imei": "356123456789012",
                "iccid": "8982123456789012345",
                "firmware_version": "1.0.0",
                "protocol_version": "1.0",
                "app_version": "1.0.0",
                "terminal_status": TerminalRegistry.TerminalStatus.ACTIVE,
            },
        )
        TerminalInstallation.objects.update_or_create(
            terminal_installation_id=SAMPLE_INSTALLATION_ID,
            defaults={
                "terminal": terminal,
                "vehicle_id": SAMPLE_VEHICLE_ID,
                "installation_status": TerminalInstallation.InstallationStatus.INSTALLED,
                "installed_at": SAMPLE_INSTALLED_AT,
                "removed_at": None,
            },
        )
        self.stdout.write(self.style.SUCCESS("Seeded terminal registry data."))
