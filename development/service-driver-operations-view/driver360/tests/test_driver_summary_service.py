from unittest import TestCase
from unittest.mock import patch

from django.test import override_settings
from rest_framework.exceptions import NotFound

from driver360.services.driver_summary_service import DriverSummaryService
from driver360.services.source_clients import SourceServiceError


class FakeSourceClients:
    def __init__(
        self,
        *,
        driver=None,
        companies=None,
        fleets=None,
        account=None,
        latest_settlement=None,
        personnel_documents=None,
        personnel_documents_error=False,
    ):
        self.driver = driver
        self.companies = companies if companies is not None else []
        self.fleets = fleets if fleets is not None else []
        self.account = account
        self.latest_settlement = latest_settlement
        self.personnel_documents = personnel_documents if personnel_documents is not None else []
        self.personnel_documents_error = personnel_documents_error

    def get_driver(self, *, driver_ref, authorization):
        return self.driver

    def list_companies(self, *, authorization):
        return self.companies

    def list_fleets(self, *, authorization):
        return self.fleets

    def get_account(self, *, account_id, authorization):
        return self.account

    def get_latest_settlement(self, *, driver_id, authorization):
        return self.latest_settlement

    def list_personnel_documents(self, *, driver_id, authorization):
        if self.personnel_documents_error:
            raise SourceServiceError("Personnel document source unavailable.")
        return self.personnel_documents


class DriverSummaryServiceTests(TestCase):
    def setUp(self) -> None:
        self.driver = {
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "account_id": "40000000-0000-0000-0000-000000000001",
            "company_id": "20000000-0000-0000-0000-000000000001",
            "fleet_id": "30000000-0000-0000-0000-000000000001",
            "name": "Kim Driver",
            "ev_id": "EV-001",
            "phone_number": "010-1234-5678",
            "address": "Seoul",
            "employment_status": "active",
            "qualification_status": "qualified",
        }
        self.companies = [
            {"company_id": "20000000-0000-0000-0000-000000000001", "name": "EVN Company"},
        ]
        self.fleets = [
            {
                "fleet_id": "30000000-0000-0000-0000-000000000001",
                "company_id": "20000000-0000-0000-0000-000000000001",
                "name": "Central Fleet",
            },
        ]
        self.account = {
            "account_id": "40000000-0000-0000-0000-000000000001",
            "email": "driver@example.com",
            "role": "user",
            "is_active": True,
        }
        self.personnel_documents = [
            {"document_type": "contract", "status": "active"},
            {"document_type": "license_or_certificate", "status": "active"},
            {"document_type": "bank_account_proof", "status": "active"},
            {"document_type": "business_registration", "status": "active"},
        ]
        self.latest_settlement = {
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "latest_settlement": {
                "settlement_run_id": "50000000-0000-0000-0000-000000000002",
                "period_start": "2026-03-01",
                "period_end": "2026-03-31",
                "status": "closed",
                "payout_status": "pending",
                "amount": "125000.50",
            },
        }

    def test_build_summary_with_linked_account_and_latest_settlement(self):
        service = DriverSummaryService(
            source_clients=FakeSourceClients(
                driver=self.driver,
                companies=self.companies,
                fleets=self.fleets,
                account=self.account,
                personnel_documents=self.personnel_documents,
                latest_settlement=self.latest_settlement,
            )
        )

        summary = service.build_summary(
            driver_ref="1",
            authorization="Bearer token",
        )

        self.assertEqual(summary["driver_name"], "Kim Driver")
        self.assertEqual(summary["company_name"], "EVN Company")
        self.assertEqual(summary["fleet_name"], "Central Fleet")
        self.assertEqual(summary["employment_status"], "active")
        self.assertEqual(summary["qualification_status"], "qualified")
        self.assertEqual(summary["account_email"], "driver@example.com")
        self.assertEqual(summary["latest_settlement_run_id"], "50000000-0000-0000-0000-000000000002")
        self.assertEqual(summary["latest_settlement_amount"], "125000.50")
        self.assertEqual(summary["latest_payout_status"], "pending")
        self.assertEqual(summary["driver_cleanup_status"], "ready")
        self.assertEqual(summary["cleanup_blockers"], [])
        self.assertEqual(summary["missing_personnel_document_types"], [])
        self.assertEqual(summary["warnings"], [])

    def test_build_summary_without_account_or_settlement(self):
        driver = {**self.driver, "account_id": None}
        service = DriverSummaryService(
            source_clients=FakeSourceClients(
                driver=driver,
                companies=self.companies,
                fleets=self.fleets,
                account=None,
                personnel_documents=self.personnel_documents,
                latest_settlement={
                    "driver_id": driver["driver_id"],
                    "latest_settlement": None,
                },
            )
        )

        summary = service.build_summary(
            driver_ref="1",
            authorization="Bearer token",
        )

        self.assertIsNone(summary["account_id"])
        self.assertIsNone(summary["account_email"])
        self.assertIsNone(summary["latest_settlement_run_id"])
        self.assertIsNone(summary["latest_settlement_amount"])
        self.assertEqual(summary["driver_cleanup_status"], "action_required")
        self.assertEqual(summary["cleanup_blockers"], ["Linked account is missing."])
        self.assertEqual(summary["warnings"], [])

    def test_build_summary_adds_warnings_for_missing_org_and_account_lookup(self):
        service = DriverSummaryService(
            source_clients=FakeSourceClients(
                driver=self.driver,
                companies=[],
                fleets=[],
                account=None,
                personnel_documents=self.personnel_documents,
                latest_settlement={
                    "driver_id": self.driver["driver_id"],
                    "latest_settlement": None,
                },
            )
        )

        summary = service.build_summary(
            driver_ref="1",
            authorization="Bearer token",
        )

        self.assertIsNone(summary["company_name"])
        self.assertIsNone(summary["fleet_name"])
        self.assertIsNone(summary["account_email"])
        self.assertEqual(
            summary["warnings"],
            [
                "Company not found for company_id=20000000-0000-0000-0000-000000000001.",
                "Fleet not found for fleet_id=30000000-0000-0000-0000-000000000001.",
                "Account not found for account_id=40000000-0000-0000-0000-000000000001.",
            ],
        )
        self.assertEqual(
            summary["cleanup_blockers"],
            [
                "Company scope is missing.",
                "Fleet scope is missing.",
                "Linked account record not found for account_id=40000000-0000-0000-0000-000000000001.",
            ],
        )
        self.assertEqual(summary["driver_cleanup_status"], "action_required")

    def test_build_summary_marks_cleanup_action_required_when_hr_status_is_not_ready(self):
        driver = {
            **self.driver,
            "employment_status": "leave",
            "qualification_status": "restricted",
        }
        service = DriverSummaryService(
            source_clients=FakeSourceClients(
                driver=driver,
                companies=self.companies,
                fleets=self.fleets,
                account=self.account,
                personnel_documents=self.personnel_documents,
                latest_settlement=self.latest_settlement,
            )
        )

        summary = service.build_summary(
            driver_ref="1",
            authorization="Bearer token",
        )

        self.assertEqual(summary["employment_status"], "leave")
        self.assertEqual(summary["qualification_status"], "restricted")
        self.assertEqual(summary["driver_cleanup_status"], "action_required")
        self.assertEqual(
            summary["cleanup_blockers"],
            [
                "Employment status is leave.",
                "Qualification status is restricted.",
            ],
        )

    def test_build_summary_marks_cleanup_unavailable_when_personnel_documents_cannot_be_read(self):
        service = DriverSummaryService(
            source_clients=FakeSourceClients(
                driver=self.driver,
                companies=self.companies,
                fleets=self.fleets,
                account=self.account,
                latest_settlement=self.latest_settlement,
                personnel_documents_error=True,
            )
        )

        summary = service.build_summary(
            driver_ref="1",
            authorization="Bearer token",
        )

        self.assertEqual(summary["driver_cleanup_status"], "unavailable")
        self.assertEqual(summary["active_personnel_document_types"], [])
        self.assertEqual(summary["missing_personnel_document_types"], [])
        self.assertEqual(summary["warnings"], ["Personnel document source unavailable."])

    def test_build_summary_raises_not_found_when_driver_is_missing(self):
        service = DriverSummaryService(source_clients=FakeSourceClients(driver=None))

        with self.assertRaisesRegex(NotFound, "Driver not found."):
            service.build_summary(
                driver_ref="1",
                authorization="Bearer token",
            )
