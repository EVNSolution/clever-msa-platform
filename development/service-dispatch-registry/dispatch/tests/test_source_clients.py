import json
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase


class DispatchSourceClientTests(SimpleTestCase):
    @patch("dispatch.services.source_clients.urlopen")
    def test_get_vehicle_returns_decoded_json(self, mocked_urlopen):
        from dispatch.services.source_clients import SourceClients

        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"vehicle_id":"v1","vehicle_status":"active"}'
        mocked_urlopen.return_value = response

        payload = SourceClients().get_vehicle(vehicle_id="v1", authorization="Bearer token")

        self.assertEqual(payload["vehicle_id"], "v1")
        self.assertEqual(payload["vehicle_status"], "active")

    @patch("dispatch.services.source_clients.urlopen")
    def test_list_vehicle_operator_accesses_returns_list(self, mocked_urlopen):
        from dispatch.services.source_clients import SourceClients

        response = MagicMock()
        response.__enter__.return_value.read.return_value = (
            b'[{"operator_company_id":"c1","access_status":"active"}]'
        )
        mocked_urlopen.return_value = response

        payload = SourceClients().list_vehicle_operator_accesses(
            vehicle_id="v1",
            access_status="active",
            authorization="Bearer token",
        )

        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["operator_company_id"], "c1")

    @patch("dispatch.services.source_clients.urlopen")
    def test_get_driver_returns_decoded_json(self, mocked_urlopen):
        from dispatch.services.source_clients import SourceClients

        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"driver_id":"d1","company_id":"c1"}'
        mocked_urlopen.return_value = response

        payload = SourceClients().get_driver(driver_id="d1", authorization="Bearer token")

        self.assertEqual(payload["driver_id"], "d1")
        self.assertEqual(payload["company_id"], "c1")

    @patch("dispatch.services.source_clients.urlopen")
    def test_get_vehicle_raises_not_found_for_404(self, mocked_urlopen):
        from urllib.error import HTTPError

        from dispatch.services.source_clients import SourceClients, SourceNotFoundError

        mocked_urlopen.side_effect = HTTPError(
            url="http://example.test/vehicle",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=None,
        )

        with self.assertRaises(SourceNotFoundError):
            SourceClients().get_vehicle(vehicle_id="v1", authorization="Bearer token")

    @patch("dispatch.services.source_clients.urlopen")
    def test_list_daily_delivery_input_snapshots_returns_list(self, mocked_urlopen):
        from dispatch.services.source_clients import SourceClients

        response = MagicMock()
        response.__enter__.return_value.read.return_value = (
            b'[{"daily_delivery_input_snapshot_id":"s1","status":"active"}]'
        )
        mocked_urlopen.return_value = response

        payload = SourceClients().list_daily_delivery_input_snapshots(
            company_id="c1",
            fleet_id="f1",
            service_date="2026-03-24",
            status="active",
            authorization="Bearer token",
        )

        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["daily_delivery_input_snapshot_id"], "s1")

    @patch("dispatch.services.source_clients.urlopen")
    def test_sync_attendance_dispatch_signals_includes_household_count(self, mocked_urlopen):
        from dispatch.services.source_clients import SourceClients

        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"days":[]}'
        mocked_urlopen.return_value = response

        SourceClients().sync_attendance_dispatch_signals(
            dispatch_date="2026-03-24",
            rows=[
                {
                    "upload_batch_id": "batch-001",
                    "upload_row_id": "row-001",
                    "matched_driver_id": "10000000-0000-0000-0000-000000000001",
                    "small_region_text": "10H2",
                    "detailed_region_text": "10H2-가",
                    "box_count": 0,
                    "household_count": 3,
                }
            ],
            authorization="Bearer token",
        )

        request = mocked_urlopen.call_args.args[0]
        body = json.loads(request.data.decode("utf-8"))
        self.assertEqual(body["signals"][0]["household_count"], 3)
