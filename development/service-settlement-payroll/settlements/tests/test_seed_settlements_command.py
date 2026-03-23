import json
from datetime import date
from unittest.mock import ANY, Mock, patch

from django.core.management.base import CommandError
from django.core.management import call_command
from django.test import TestCase, override_settings


class SeedSettlementsCommandTests(TestCase):
    @override_settings(
        SETTLEMENT_ORG_BASE_URL="http://organization-master-api:8000",
        SETTLEMENT_DRIVER_BASE_URL="http://driver-profile-api:8000",
    )
    @patch("settlements.management.commands.seed_settlements.urlopen")
    def test_seed_command_raises_command_error_for_malformed_upstream_json(self, mock_urlopen):
        class Response:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self):
                return b""

        mock_urlopen.return_value = Response()

        with self.assertRaises(CommandError):
            call_command("seed_settlements", stdout=Mock())

    @override_settings(
        SETTLEMENT_ORG_BASE_URL="http://organization-master-api:8000",
        SETTLEMENT_DRIVER_BASE_URL="http://driver-profile-api:8000",
    )
    @patch("settlements.management.commands.seed_settlements.SettlementItem.objects.update_or_create")
    @patch("settlements.management.commands.seed_settlements.SettlementRun.objects.update_or_create")
    @patch("settlements.management.commands.seed_settlements.urlopen")
    def test_seed_command_uses_seeded_org_and_driver_records(
        self,
        mock_urlopen,
        mock_run_update_or_create,
        mock_item_update_or_create,
    ):
        class Response:
            def __init__(self, payload):
                self.status = 200
                self._payload = payload

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self):
                return json.dumps(self._payload).encode("utf-8")

        mock_urlopen.side_effect = [
            Response(
                [
                    {"company_id": "30000000-0000-0000-0000-000000000001", "name": "Seed Company"},
                ]
            ),
            Response(
                [
                    {
                        "fleet_id": "40000000-0000-0000-0000-000000000001",
                        "company_id": "30000000-0000-0000-0000-000000000001",
                        "name": "Seed Fleet",
                    }
                ]
            ),
            Response(
                [
                    {
                        "driver_id": "10000000-0000-0000-0000-000000000001",
                        "company_id": "30000000-0000-0000-0000-000000000001",
                        "fleet_id": "40000000-0000-0000-0000-000000000001",
                        "name": "Seed Driver",
                    }
                ]
            ),
        ]
        mock_run_update_or_create.return_value = (Mock(), True)
        mock_item_update_or_create.return_value = (Mock(), True)

        call_command("seed_settlements", stdout=Mock())

        requested_urls = [call.args[0].full_url for call in mock_urlopen.call_args_list]
        requested_auth_headers = [
            call.args[0].headers.get("Authorization") for call in mock_urlopen.call_args_list
        ]
        requested_timeouts = [call.kwargs.get("timeout") for call in mock_urlopen.call_args_list]

        self.assertEqual(
            requested_urls,
            [
                "http://organization-master-api:8000/companies/",
                "http://organization-master-api:8000/fleets/",
                "http://driver-profile-api:8000/",
            ],
        )
        self.assertTrue(all(header and header.startswith("Bearer ") for header in requested_auth_headers))
        self.assertTrue(all(timeout == 10 for timeout in requested_timeouts))

        mock_run_update_or_create.assert_called_once_with(
            settlement_run_id=ANY,
            defaults={
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "period_start": date(2026, 3, 1),
                "period_end": date(2026, 3, 31),
                "status": "draft",
            },
        )
        mock_item_update_or_create.assert_called_once_with(
            settlement_item_id=ANY,
            defaults={
                "settlement_run_id": ANY,
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "amount": "125000.50",
                "payout_status": "pending",
            },
        )

    @override_settings(
        SETTLEMENT_ORG_BASE_URL="http://organization-master-api:8000",
        SETTLEMENT_DRIVER_BASE_URL="http://driver-profile-api:8000",
    )
    @patch("settlements.management.commands.seed_settlements.SettlementItem.objects.update_or_create")
    @patch("settlements.management.commands.seed_settlements.SettlementRun.objects.update_or_create")
    @patch("settlements.management.commands.seed_settlements.urlopen")
    def test_seed_command_prefers_fixed_seed_ids_when_names_are_duplicated(
        self,
        mock_urlopen,
        mock_run_update_or_create,
        mock_item_update_or_create,
    ):
        class Response:
            def __init__(self, payload):
                self.status = 200
                self._payload = payload

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self):
                return json.dumps(self._payload).encode("utf-8")

        mock_urlopen.side_effect = [
            Response(
                [
                    {"company_id": "66d95880-1a9d-4073-a924-68b9696abe77", "name": "Seed Company"},
                    {"company_id": "30000000-0000-0000-0000-000000000001", "name": "Seed Company"},
                ]
            ),
            Response(
                [
                    {
                        "fleet_id": "54692453-efd0-4c52-a054-e9d7dd10d3c4",
                        "company_id": "66d95880-1a9d-4073-a924-68b9696abe77",
                        "name": "Seed Fleet",
                    },
                    {
                        "fleet_id": "40000000-0000-0000-0000-000000000001",
                        "company_id": "30000000-0000-0000-0000-000000000001",
                        "name": "Seed Fleet",
                    },
                ]
            ),
            Response(
                [
                    {
                        "driver_id": "10000000-0000-0000-0000-000000000001",
                        "company_id": "30000000-0000-0000-0000-000000000001",
                        "fleet_id": "40000000-0000-0000-0000-000000000001",
                        "name": "Seed Driver",
                    }
                ]
            ),
        ]
        mock_run_update_or_create.return_value = (Mock(), True)
        mock_item_update_or_create.return_value = (Mock(), True)

        call_command("seed_settlements", stdout=Mock())

        mock_run_update_or_create.assert_called_once_with(
            settlement_run_id=ANY,
            defaults={
                "company_id": "30000000-0000-0000-0000-000000000001",
                "fleet_id": "40000000-0000-0000-0000-000000000001",
                "period_start": date(2026, 3, 1),
                "period_end": date(2026, 3, 31),
                "status": "draft",
            },
        )
        mock_item_update_or_create.assert_called_once_with(
            settlement_item_id=ANY,
            defaults={
                "settlement_run_id": ANY,
                "driver_id": "10000000-0000-0000-0000-000000000001",
                "amount": "125000.50",
                "payout_status": "pending",
            },
        )
