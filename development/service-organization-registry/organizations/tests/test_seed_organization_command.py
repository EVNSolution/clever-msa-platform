from unittest.mock import Mock
from uuid import UUID

from django.core.management import call_command
from django.test import TestCase

from organizations.models import Company, Fleet


CHEONHA_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")
CHEONHA_FLEET_ID = UUID("40000000-0000-0000-0000-000000000001")


class SeedOrganizationCommandTests(TestCase):
    def test_command_upserts_cheonha_company_as_canonical_tenant(self):
        Company.objects.create(company_id=CHEONHA_COMPANY_ID, name="Seed Company")
        Fleet.objects.create(
            fleet_id=CHEONHA_FLEET_ID,
            company_id=CHEONHA_COMPANY_ID,
            name="Seed Fleet",
        )

        call_command("seed_organization", stdout=Mock())
        call_command("seed_organization", stdout=Mock())

        company = Company.objects.get(company_id=CHEONHA_COMPANY_ID)
        self.assertEqual(company.name, "천하운수")
        self.assertEqual(company.tenant_code, "cheonha")
        self.assertEqual(company.workflow_profile, "cheonha_ops_v1")
        self.assertEqual(company.enabled_features, ["settlement", "vehicle"])
        self.assertEqual(
            company.home_dashboard_preset,
            {"cards": ["settlement", "vehicle", "placeholder", "placeholder"]},
        )
        self.assertEqual(
            company.workspace_presets,
            {
                "settlement": {
                    "tabs": [
                        "dispatch-data",
                        "driver-management",
                        "operations-status",
                        "settlement-processing",
                        "team-management",
                    ]
                }
            },
        )

        fleet = Fleet.objects.get(fleet_id=CHEONHA_FLEET_ID)
        self.assertEqual(fleet.company_id, CHEONHA_COMPANY_ID)
        self.assertEqual(fleet.name, "천하운수 기본 플릿")

        self.assertEqual(Company.objects.count(), 1)
        self.assertEqual(Fleet.objects.count(), 1)
