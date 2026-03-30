from unittest import TestCase
from unittest.mock import Mock, patch
from urllib.error import HTTPError

from django.test import override_settings

from vehicleops.services.source_clients import SourceClients, SourceNotFoundError, SourceServiceError


class SourceClientsTests(TestCase):
    def setUp(self) -> None:
        self.authorization = "Bearer token"

    def _build_response(self, payload, status_code=200):
        response = Mock()
        response.read.return_value = payload.encode("utf-8")
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.status = status_code
        return response

    @override_settings(
        VEHICLE_ASSET_BASE_URL="http://vehicle-asset-api:8000",
        ORGANIZATION_MASTER_BASE_URL="http://organization-master-api:8000",
        DRIVER_VEHICLE_ASSIGNMENT_BASE_URL="http://driver-vehicle-assignment-api:8000",
        TELEMETRY_HUB_BASE_URL="http://telemetry-hub-api:8000",
        TERMINAL_REGISTRY_BASE_URL="http://terminal-registry-api:8000",
    )
    @patch("vehicleops.services.source_clients.urlopen")
    def test_builds_split_vehicle_urls_and_forwards_authorization(self, mock_urlopen):
        mock_urlopen.side_effect = [
            self._build_response('{"vehicle_id": "v1"}'),
            self._build_response('[{"vehicle_id": "v1"}]'),
            self._build_response('[{"vehicle_operator_access_id": "a1"}]'),
            self._build_response('[{"company_id": "c1", "name": "Company"}]'),
            self._build_response('[{"driver_vehicle_assignment_id": "d1"}]'),
            self._build_response('{"vehicle_id": "v1", "snapshot_status": "fresh"}'),
            self._build_response('[{"diagnostic_event_id": "diag1"}]'),
            self._build_response('[{"terminal_id": "t1"}]'),
            self._build_response('[{"terminal_installation_id": "ti1"}]'),
        ]

        clients = SourceClients()

        detail = clients.get_vehicle(vehicle_ref="v1", authorization=self.authorization)
        vehicles = clients.list_vehicles(authorization=self.authorization)
        operator_accesses = clients.list_active_operator_accesses(authorization=self.authorization)
        companies = clients.list_companies(authorization=self.authorization)
        assignments = clients.list_assigned_assignments(authorization=self.authorization)
        latest_location = clients.get_latest_vehicle_location(
            vehicle_id="v1",
            authorization=self.authorization,
        )
        latest_diagnostics = clients.list_latest_vehicle_diagnostics(
            vehicle_id="v1",
            authorization=self.authorization,
        )
        terminals = clients.list_terminals(authorization=self.authorization)
        installations = clients.list_installed_terminal_installations(
            authorization=self.authorization,
        )

        self.assertEqual(detail, {"vehicle_id": "v1"})
        self.assertEqual(vehicles, [{"vehicle_id": "v1"}])
        self.assertEqual(operator_accesses, [{"vehicle_operator_access_id": "a1"}])
        self.assertEqual(companies, [{"company_id": "c1", "name": "Company"}])
        self.assertEqual(assignments, [{"driver_vehicle_assignment_id": "d1"}])
        self.assertEqual(latest_location, {"vehicle_id": "v1", "snapshot_status": "fresh"})
        self.assertEqual(latest_diagnostics, [{"diagnostic_event_id": "diag1"}])
        self.assertEqual(terminals, [{"terminal_id": "t1"}])
        self.assertEqual(installations, [{"terminal_installation_id": "ti1"}])
        self.assertEqual(
            [call.args[0].full_url for call in mock_urlopen.call_args_list],
            [
                "http://vehicle-asset-api:8000/vehicle-masters/v1/",
                "http://vehicle-asset-api:8000/vehicle-masters/",
                "http://vehicle-asset-api:8000/vehicle-operator-accesses/?access_status=active",
                "http://organization-master-api:8000/companies/",
                "http://driver-vehicle-assignment-api:8000/assignments/?assignment_status=assigned",
                "http://telemetry-hub-api:8000/vehicles/v1/latest-location/",
                "http://telemetry-hub-api:8000/vehicles/v1/latest-diagnostics/",
                "http://terminal-registry-api:8000/",
                "http://terminal-registry-api:8000/installations/?installation_status=installed",
            ],
        )
        self.assertEqual(
            [call.args[0].get_header("Authorization") for call in mock_urlopen.call_args_list],
            [
                self.authorization,
                self.authorization,
                self.authorization,
                self.authorization,
                self.authorization,
                self.authorization,
                self.authorization,
                self.authorization,
                self.authorization,
            ],
        )

    @override_settings(VEHICLE_ASSET_BASE_URL="http://vehicle-asset-api:8000")
    @patch("vehicleops.services.source_clients.urlopen")
    def test_maps_404_to_source_not_found_error(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            url="http://vehicle-asset-api:8000/vehicle-masters/v1/",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=None,
        )

        clients = SourceClients()

        with self.assertRaises(SourceNotFoundError):
            clients.get_vehicle(vehicle_ref="v1", authorization=self.authorization)

    @override_settings(VEHICLE_ASSET_BASE_URL="http://vehicle-asset-api:8000")
    @patch("vehicleops.services.source_clients.urlopen")
    def test_maps_non_404_failure_to_source_service_error(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            url="http://vehicle-asset-api:8000/vehicle-masters/",
            code=500,
            msg="Internal Server Error",
            hdrs=None,
            fp=None,
        )

        clients = SourceClients()

        with self.assertRaises(SourceServiceError):
            clients.list_vehicles(authorization=self.authorization)
