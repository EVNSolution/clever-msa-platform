from uuid import UUID

from django.core.management.base import BaseCommand

from organizations.models import Company, Fleet


SAMPLE_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")
SAMPLE_FLEET_ID = UUID("40000000-0000-0000-0000-000000000001")


class Command(BaseCommand):
    help = "Create or update the seeded organization structure."

    def handle(self, *args, **options):
        company, _ = Company.objects.update_or_create(
            company_id=SAMPLE_COMPANY_ID,
            defaults={
                "name": "천하운수",
                "tenant_code": "cheonha",
            },
        )
        Fleet.objects.update_or_create(
            fleet_id=SAMPLE_FLEET_ID,
            defaults={
                "company_id": company.company_id,
                "name": "천하운수 기본 플릿",
            },
        )

        self.stdout.write(self.style.SUCCESS("Seeded organization structure."))
