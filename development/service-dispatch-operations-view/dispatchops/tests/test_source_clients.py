from datetime import date
from unittest import TestCase
from unittest.mock import Mock, patch
from urllib.error import HTTPError

from django.test import override_settings

from dispatchops.services.source_clients import (
    SourceClients,
    SourceNotFoundError,
    SourceServiceError,
)


class SourceClientsTests(TestCase):
    def setUp(self) -> None:
        self.authorization = "Bearer token"

    def _build_response(self, payload: str):
        response = Mock()
        response.read.return_value = payload.encode("utf-8")
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        return response

    @override_settings(
        DISPATCH_REGISTRY_BASE_URL="http://dispatch-registry-api:8000/",
        DRIVER_VEHICLE_ASSIGNMENT_BASE_URL="http://vehicle-assignment-api:8000/",
        VEHICLE_ASSET_BASE_URL="http://vehicle-registry-api:8000/",
        DRIVER_PROFILE_BASE_URL="http://driver-profile-api:8000/",
    )
    @patch("dispatchops.services.source_clients.urlopen")
    def test_builds_urls_forwards_authorization_and_filters_locally(self, mock_urlopen):
        mock_urlopen.side_effect = [
            self._build_response(
                """
                [
                    {"dispatch_plan_id": "plan-1", "fleet_id": "fleet-a", "dispatch_date": "2026-03-24"},
                    {"dispatch_plan_id": "plan-2", "fleet_id": "fleet-a", "dispatch_date": "2026-03-24"},
                    {"dispatch_plan_id": "plan-3", "fleet_id": "fleet-b", "dispatch_date": "2026-03-24"}
                ]
                """
            ),
            self._build_response(
                """
                [
                    {"dispatch_assignment_id": "assignment-1", "dispatch_date": "2026-03-24"},
                    {"dispatch_assignment_id": "assignment-2", "dispatch_date": "2026-03-25"}
                ]
                """
            ),
            self._build_response(
                """
                [
                    {"driver_vehicle_assignment_id": "current-1", "assignment_status": "assigned"},
                    {"driver_vehicle_assignment_id": "current-2", "assignment_status": "unassigned"}
                ]
                """
            ),
            self._build_response(
                """
                [
                    {"vehicle_id": "vehicle-1", "plate_number": "12가3456"},
                    {"vehicle_id": "vehicle-2", "plate_number": "34나5678"}
                ]
                """
            ),
            self._build_response(
                """
                [
                    {"driver_id": "driver-1", "name": "Kim Driver"},
                    {"driver_id": "driver-2", "name": "Lee Driver"}
                ]
                """
            ),
        ]

        clients = SourceClients()

        plans = clients.list_dispatch_plans(
            dispatch_date=date(2026, 3, 24),
            fleet_id="fleet-a",
            authorization=self.authorization,
        )
        assignments = clients.list_dispatch_assignments(
            dispatch_date="2026-03-24",
            authorization=self.authorization,
        )
        current_assignments = clients.list_assigned_assignments(authorization=self.authorization)
        vehicles = clients.list_vehicle_masters(authorization=self.authorization)
        drivers = clients.list_drivers(authorization=self.authorization)

        self.assertEqual(
            [plan["dispatch_plan_id"] for plan in plans],
            ["plan-1", "plan-2"],
        )
        self.assertEqual(
            [assignment["dispatch_assignment_id"] for assignment in assignments],
            ["assignment-1"],
        )
        self.assertEqual(
            [assignment["driver_vehicle_assignment_id"] for assignment in current_assignments],
            ["current-1"],
        )
        self.assertEqual([vehicle["vehicle_id"] for vehicle in vehicles], ["vehicle-1", "vehicle-2"])
        self.assertEqual([driver["driver_id"] for driver in drivers], ["driver-1", "driver-2"])
        self.assertEqual(
            [call.args[0].full_url for call in mock_urlopen.call_args_list],
            [
                "http://dispatch-registry-api:8000/plans/",
                "http://dispatch-registry-api:8000/assignments/",
                "http://vehicle-assignment-api:8000/assignments/",
                "http://vehicle-registry-api:8000/vehicle-masters/",
                "http://driver-profile-api:8000/",
            ],
        )
        self.assertEqual(
            [call.args[0].get_header("Authorization") for call in mock_urlopen.call_args_list],
            [self.authorization] * 5,
        )

    @patch("dispatchops.services.source_clients.urlopen")
    def test_request_json_maps_404_to_source_not_found_error_when_allowed(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            url="http://dispatch-registry-api:8000/plans/",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=None,
        )

        with self.assertRaises(SourceNotFoundError):
            SourceClients()._request_json(
                url="http://dispatch-registry-api:8000/plans/",
                authorization=self.authorization,
                allow_not_found=True,
            )

    @override_settings(VEHICLE_ASSET_BASE_URL="http://vehicle-registry-api:8000/")
    @patch("dispatchops.services.source_clients.urlopen")
    def test_list_vehicle_masters_maps_invalid_json_to_source_service_error(self, mock_urlopen):
        mock_urlopen.return_value = self._build_response("not-json")

        with self.assertRaises(SourceServiceError):
            SourceClients().list_vehicle_masters(authorization=self.authorization)

    @override_settings(DISPATCH_REGISTRY_BASE_URL="http://dispatch-registry-api:8000/")
    @patch("dispatchops.services.source_clients.urlopen")
    def test_list_dispatch_plans_maps_http_500_to_source_service_error(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            url="http://dispatch-registry-api:8000/plans/",
            code=500,
            msg="Internal Server Error",
            hdrs=None,
            fp=None,
        )

        with self.assertRaises(SourceServiceError):
            SourceClients().list_dispatch_plans(
                dispatch_date="2026-03-24",
                fleet_id="fleet-a",
                authorization=self.authorization,
            )

    @override_settings(DISPATCH_REGISTRY_BASE_URL="http://dispatch-registry-api:8000/")
    @patch("dispatchops.services.source_clients.urlopen")
    def test_list_dispatch_plans_rejects_non_list_payloads(self, mock_urlopen):
        mock_urlopen.return_value = self._build_response('{"detail": "not a list"}')

        with self.assertRaises(SourceServiceError):
            SourceClients().list_dispatch_plans(
                dispatch_date="2026-03-24",
                fleet_id="fleet-a",
                authorization=self.authorization,
            )

    @override_settings(DISPATCH_REGISTRY_BASE_URL="http://dispatch-registry-api:8000/")
    @patch("dispatchops.services.source_clients.urlopen")
    def test_list_dispatch_plans_rejects_non_utf8_payloads(self, mock_urlopen):
        response = Mock()
        response.read.return_value = b"\xff\xfe\x00"
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = response

        with self.assertRaises(SourceServiceError):
            SourceClients().list_dispatch_plans(
                dispatch_date="2026-03-24",
                fleet_id="fleet-a",
                authorization=self.authorization,
            )

    @override_settings(DISPATCH_REGISTRY_BASE_URL="http://dispatch-registry-api:8000/")
    @patch("dispatchops.services.source_clients.urlopen")
    def test_filter_items_rejects_malformed_list_members(self, mock_urlopen):
        mock_urlopen.return_value = self._build_response(
            """
            [
                {"dispatch_plan_id": "plan-1", "fleet_id": "fleet-a", "dispatch_date": "2026-03-24"},
                "malformed"
            ]
            """
        )

        with self.assertRaises(SourceServiceError):
            SourceClients().list_dispatch_plans(
                dispatch_date="2026-03-24",
                fleet_id="fleet-a",
                authorization=self.authorization,
            )
