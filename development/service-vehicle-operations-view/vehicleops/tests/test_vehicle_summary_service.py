from unittest import TestCase

from rest_framework.exceptions import APIException, NotFound

from vehicleops.serializers import VehicleOpsSummarySerializer
from vehicleops.services.source_clients import SourceServiceError
from vehicleops.services.vehicle_summary_service import VehicleSummaryService


class FakeSourceClients:
    def __init__(
        self,
        *,
        vehicle=None,
        vehicles=None,
        companies=None,
        operator_accesses=None,
        assignments=None,
        terminals=None,
        terminal_installations=None,
        latest_location=None,
        latest_diagnostics=None,
        vehicles_error=None,
        companies_error=None,
        operator_accesses_error=None,
        assignments_error=None,
        terminals_error=None,
        terminal_installations_error=None,
        latest_location_error=None,
        latest_diagnostics_error=None,
    ):
        self.vehicle = vehicle
        self.vehicles = vehicles if vehicles is not None else []
        self.companies = companies if companies is not None else []
        self.operator_accesses = operator_accesses if operator_accesses is not None else []
        self.assignments = assignments if assignments is not None else []
        self.terminals = terminals if terminals is not None else []
        self.terminal_installations = (
            terminal_installations if terminal_installations is not None else []
        )
        self.latest_location = latest_location
        self.latest_diagnostics = latest_diagnostics if latest_diagnostics is not None else []
        self.vehicles_error = vehicles_error
        self.companies_error = companies_error
        self.operator_accesses_error = operator_accesses_error
        self.assignments_error = assignments_error
        self.terminals_error = terminals_error
        self.terminal_installations_error = terminal_installations_error
        self.latest_location_error = latest_location_error
        self.latest_diagnostics_error = latest_diagnostics_error

    def get_vehicle(self, *, vehicle_ref, authorization):
        if self.vehicles_error is not None:
            raise self.vehicles_error
        return self.vehicle

    def list_vehicles(self, *, authorization):
        if self.vehicles_error is not None:
            raise self.vehicles_error
        return self.vehicles

    def list_companies(self, *, authorization):
        if self.companies_error is not None:
            raise self.companies_error
        return self.companies

    def list_active_operator_accesses(self, *, authorization):
        if self.operator_accesses_error is not None:
            raise self.operator_accesses_error
        return self.operator_accesses

    def list_assigned_assignments(self, *, authorization):
        if self.assignments_error is not None:
            raise self.assignments_error
        return self.assignments

    def list_terminals(self, *, authorization):
        if self.terminals_error is not None:
            raise self.terminals_error
        return self.terminals

    def list_installed_terminal_installations(self, *, authorization):
        if self.terminal_installations_error is not None:
            raise self.terminal_installations_error
        return self.terminal_installations

    def get_latest_vehicle_location(self, *, vehicle_id, authorization):
        if self.latest_location_error is not None:
            raise self.latest_location_error
        return self.latest_location

    def list_latest_vehicle_diagnostics(self, *, vehicle_id, authorization):
        if self.latest_diagnostics_error is not None:
            raise self.latest_diagnostics_error
        return self.latest_diagnostics


class VehicleSummaryServiceTests(TestCase):
    def setUp(self) -> None:
        self.vehicle = {
            "vehicle_id": "11111111-1111-1111-1111-111111111111",
            "route_no": 1,
            "manufacturer_company_id": "22222222-2222-2222-2222-222222222222",
            "plate_number": "12가3456",
            "vin": "KMH00000000000001",
            "vehicle_status": "active",
        }
        self.vehicles = [self.vehicle]
        self.operator_access = {
            "vehicle_operator_access_id": "51000000-0000-0000-0000-000000000001",
            "vehicle_id": self.vehicle["vehicle_id"],
            "operator_company_id": "33333333-3333-3333-3333-333333333333",
            "access_status": "active",
        }
        self.assignment = {
            "driver_vehicle_assignment_id": "60000000-0000-0000-0000-000000000001",
            "driver_id": "10000000-0000-0000-0000-000000000001",
            "vehicle_id": self.vehicle["vehicle_id"],
            "operator_company_id": self.operator_access["operator_company_id"],
            "assignment_status": "assigned",
            "assigned_at": "2026-03-20T10:00:00Z",
        }
        self.latest_location = {
            "vehicle_id": self.vehicle["vehicle_id"],
            "terminal_id": "70000000-0000-0000-0000-000000000001",
            "lat": 37.5665,
            "lng": 126.9780,
            "captured_at": "2026-03-20T10:05:00Z",
            "snapshot_status": "fresh",
        }
        self.latest_diagnostic = {
            "diagnostic_event_id": "80000000-0000-0000-0000-000000000001",
            "vehicle_id": self.vehicle["vehicle_id"],
            "terminal_id": "70000000-0000-0000-0000-000000000001",
            "event_code": "BAT_LOW",
            "severity": "warning",
            "event_message": "Battery is low.",
            "captured_at": "2026-03-20T10:04:00Z",
            "event_status": "open",
        }
        self.terminal = {
            "terminal_id": "70000000-0000-0000-0000-000000000001",
            "manufacturer_company_id": self.vehicle["manufacturer_company_id"],
            "imei": "356123456789012",
            "iccid": "8982123412341234123",
            "firmware_version": "1.0.0",
            "protocol_version": "2.1",
            "app_version": "3.4.5",
            "terminal_status": "active",
        }
        self.terminal_installation = {
            "terminal_installation_id": "71000000-0000-0000-0000-000000000001",
            "terminal_id": self.terminal["terminal_id"],
            "vehicle_id": self.vehicle["vehicle_id"],
            "installation_status": "installed",
            "installed_at": "2026-03-20T09:55:00Z",
            "removed_at": None,
        }
        self.companies = [
            {
                "company_id": self.vehicle["manufacturer_company_id"],
                "name": "Manufacturer Co",
            },
            {
                "company_id": self.operator_access["operator_company_id"],
                "name": "Operator Co",
            },
        ]

    def test_build_summary_combines_vehicle_master_operator_access_assignment_and_company_names(self):
        service = VehicleSummaryService(
            source_clients=FakeSourceClients(
                vehicle=self.vehicle,
                companies=self.companies,
                operator_accesses=[self.operator_access],
                assignments=[self.assignment],
                terminals=[self.terminal],
                terminal_installations=[self.terminal_installation],
                latest_location=self.latest_location,
                latest_diagnostics=[self.latest_diagnostic],
            )
        )

        summary = service.build_summary(
            vehicle_ref=self.vehicle["vehicle_id"],
            authorization="Bearer token",
        )

        self.assertEqual(summary["vehicle_id"], self.vehicle["vehicle_id"])
        self.assertEqual(summary["route_no"], self.vehicle["route_no"])
        self.assertEqual(summary["plate_number"], "12가3456")
        self.assertEqual(summary["vin"], "KMH00000000000001")
        self.assertEqual(summary["vehicle_status"], "active")
        self.assertEqual(
            summary["manufacturer_company"],
            {
                "company_id": self.vehicle["manufacturer_company_id"],
                "company_name": "Manufacturer Co",
            },
        )
        self.assertEqual(
            summary["active_operator_company"],
            {
                "company_id": self.operator_access["operator_company_id"],
                "company_name": "Operator Co",
                "access_status": "active",
            },
        )
        self.assertEqual(
            summary["current_assignment"],
            {
                "driver_vehicle_assignment_id": self.assignment["driver_vehicle_assignment_id"],
                "driver_id": self.assignment["driver_id"],
                "assignment_status": "assigned",
                "assigned_at": self.assignment["assigned_at"],
            },
        )
        self.assertEqual(
            summary["current_terminal"],
            {
                "terminal_id": self.terminal["terminal_id"],
                "installation_status": self.terminal_installation["installation_status"],
                "installed_at": self.terminal_installation["installed_at"],
                "imei": self.terminal["imei"],
                "iccid": self.terminal["iccid"],
                "firmware_version": self.terminal["firmware_version"],
                "protocol_version": self.terminal["protocol_version"],
                "app_version": self.terminal["app_version"],
            },
        )
        self.assertEqual(
            summary["telemetry"],
            {
                "latest_location": {
                    "lat": self.latest_location["lat"],
                    "lng": self.latest_location["lng"],
                    "captured_at": self.latest_location["captured_at"],
                    "snapshot_status": self.latest_location["snapshot_status"],
                },
                "latest_diagnostic": {
                    "event_code": self.latest_diagnostic["event_code"],
                    "severity": self.latest_diagnostic["severity"],
                    "event_status": self.latest_diagnostic["event_status"],
                    "captured_at": self.latest_diagnostic["captured_at"],
                },
            },
        )
        self.assertEqual(summary["warnings"], [])

    def test_build_summary_allows_missing_operator_access_and_current_assignment(self):
        service = VehicleSummaryService(
            source_clients=FakeSourceClients(
                vehicle=self.vehicle,
                companies=self.companies[:1],
                operator_accesses=[],
                assignments=[],
                terminals=[],
                terminal_installations=[],
                latest_location=None,
                latest_diagnostics=[],
            )
        )

        summary = service.build_summary(
            vehicle_ref=self.vehicle["vehicle_id"],
            authorization="Bearer token",
        )

        self.assertEqual(
            summary["active_operator_company"],
            {
                "company_id": None,
                "company_name": None,
                "access_status": None,
            },
        )
        self.assertIsNone(summary["current_assignment"])
        self.assertIsNone(summary["current_terminal"])
        self.assertEqual(
            summary["telemetry"],
            {
                "latest_location": {
                    "lat": None,
                    "lng": None,
                    "captured_at": None,
                    "snapshot_status": None,
                },
                "latest_diagnostic": {
                    "event_code": None,
                    "severity": None,
                    "event_status": None,
                    "captured_at": None,
                },
            },
        )
        self.assertEqual(
            summary["warnings"],
            [
                "current_terminal_missing",
                "latest_location_missing",
                "latest_diagnostic_missing",
            ],
        )

    def test_build_summary_adds_warning_codes_for_missing_company_name_lookups(self):
        service = VehicleSummaryService(
            source_clients=FakeSourceClients(
                vehicle=self.vehicle,
                companies=[],
                operator_accesses=[self.operator_access],
                assignments=[self.assignment],
                terminals=[],
                terminal_installations=[],
                latest_location=None,
                latest_diagnostics=[],
            )
        )

        summary = service.build_summary(
            vehicle_ref=self.vehicle["vehicle_id"],
            authorization="Bearer token",
        )

        self.assertEqual(
            summary["warnings"],
            [
                "manufacturer_company_name_missing",
                "active_operator_company_name_missing",
                "current_terminal_missing",
                "latest_location_missing",
                "latest_diagnostic_missing",
            ],
        )
        self.assertEqual(summary["manufacturer_company"]["company_id"], self.vehicle["manufacturer_company_id"])
        self.assertIsNone(summary["manufacturer_company"]["company_name"])
        self.assertEqual(
            summary["active_operator_company"]["company_id"],
            self.operator_access["operator_company_id"],
        )
        self.assertIsNone(summary["active_operator_company"]["company_name"])

    def test_build_summary_fails_when_assignment_service_is_unavailable(self):
        service = VehicleSummaryService(
            source_clients=FakeSourceClients(
                vehicle=self.vehicle,
                companies=self.companies,
                operator_accesses=[self.operator_access],
                assignments_error=SourceServiceError("assignment unavailable"),
                terminals=[self.terminal],
                terminal_installations=[self.terminal_installation],
                latest_location=self.latest_location,
                latest_diagnostics=[self.latest_diagnostic],
            )
        )

        with self.assertRaisesRegex(APIException, "Driver vehicle assignment service is unavailable."):
            service.build_summary(
                vehicle_ref=self.vehicle["vehicle_id"],
                authorization="Bearer token",
            )

    def test_build_summary_warns_when_terminal_installation_exists_but_registry_row_is_missing(self):
        service = VehicleSummaryService(
            source_clients=FakeSourceClients(
                vehicle=self.vehicle,
                companies=self.companies,
                operator_accesses=[self.operator_access],
                assignments=[self.assignment],
                terminals=[],
                terminal_installations=[self.terminal_installation],
                latest_location=self.latest_location,
                latest_diagnostics=[self.latest_diagnostic],
            )
        )

        summary = service.build_summary(
            vehicle_ref=self.vehicle["vehicle_id"],
            authorization="Bearer token",
        )

        self.assertEqual(
            summary["current_terminal"],
            {
                "terminal_id": self.terminal_installation["terminal_id"],
                "installation_status": self.terminal_installation["installation_status"],
                "installed_at": self.terminal_installation["installed_at"],
                "imei": None,
                "iccid": None,
                "firmware_version": None,
                "protocol_version": None,
                "app_version": None,
            },
        )
        self.assertEqual(summary["warnings"], ["current_terminal_unavailable"])

    def test_build_summary_ignores_non_assigned_rows_if_upstream_returns_them(self):
        service = VehicleSummaryService(
            source_clients=FakeSourceClients(
                vehicle=self.vehicle,
                companies=self.companies,
                operator_accesses=[self.operator_access],
                assignments=[
                    self.assignment,
                    {
                        "driver_vehicle_assignment_id": "60000000-0000-0000-0000-000000000099",
                        "driver_id": "10000000-0000-0000-0000-000000000099",
                        "vehicle_id": self.vehicle["vehicle_id"],
                        "operator_company_id": self.operator_access["operator_company_id"],
                        "assignment_status": "unassigned",
                        "assigned_at": None,
                    },
                ],
                terminals=[self.terminal],
                terminal_installations=[self.terminal_installation],
                latest_location=self.latest_location,
                latest_diagnostics=[self.latest_diagnostic],
            )
        )

        summary = service.build_summary(
            vehicle_ref=self.vehicle["vehicle_id"],
            authorization="Bearer token",
        )

        self.assertEqual(
            summary["current_assignment"]["driver_vehicle_assignment_id"],
            self.assignment["driver_vehicle_assignment_id"],
        )

    def test_build_summary_warns_when_latest_location_and_diagnostic_are_missing(self):
        service = VehicleSummaryService(
            source_clients=FakeSourceClients(
                vehicle=self.vehicle,
                companies=self.companies,
                operator_accesses=[self.operator_access],
                assignments=[self.assignment],
                terminals=[],
                terminal_installations=[],
                latest_location=None,
                latest_diagnostics=[],
            )
        )

        summary = service.build_summary(
            vehicle_ref=self.vehicle["vehicle_id"],
            authorization="Bearer token",
        )

        self.assertEqual(
            summary["warnings"],
            [
                "current_terminal_missing",
                "latest_location_missing",
                "latest_diagnostic_missing",
            ],
        )

    def test_build_summary_degrades_when_terminal_registry_service_is_unavailable(self):
        service = VehicleSummaryService(
            source_clients=FakeSourceClients(
                vehicle=self.vehicle,
                companies=self.companies,
                operator_accesses=[self.operator_access],
                assignments=[self.assignment],
                terminals_error=SourceServiceError("terminal unavailable"),
                latest_location=self.latest_location,
                latest_diagnostics=[self.latest_diagnostic],
            )
        )

        summary = service.build_summary(
            vehicle_ref=self.vehicle["vehicle_id"],
            authorization="Bearer token",
        )

        self.assertIsNone(summary["current_terminal"])
        self.assertIn("current_terminal_missing", summary["warnings"])

    def test_build_summary_degrades_when_telemetry_service_is_unavailable(self):
        service = VehicleSummaryService(
            source_clients=FakeSourceClients(
                vehicle=self.vehicle,
                companies=self.companies,
                operator_accesses=[self.operator_access],
                assignments=[self.assignment],
                terminals=[self.terminal],
                terminal_installations=[self.terminal_installation],
                latest_diagnostics=[self.latest_diagnostic],
                latest_location_error=SourceServiceError("telemetry unavailable"),
            )
        )

        summary = service.build_summary(
            vehicle_ref=self.vehicle["vehicle_id"],
            authorization="Bearer token",
        )

        self.assertEqual(
            summary["telemetry"]["latest_location"],
            {
                "lat": None,
                "lng": None,
                "captured_at": None,
                "snapshot_status": "unavailable",
            },
        )
        self.assertEqual(
            summary["telemetry"]["latest_diagnostic"],
            {
                "event_code": self.latest_diagnostic["event_code"],
                "severity": self.latest_diagnostic["severity"],
                "event_status": self.latest_diagnostic["event_status"],
                "captured_at": self.latest_diagnostic["captured_at"],
            },
        )
        self.assertIn("latest_location_missing", summary["warnings"])

    def test_build_summary_raises_not_found_when_vehicle_is_missing(self):
        service = VehicleSummaryService(source_clients=FakeSourceClients(vehicle=None))

        with self.assertRaisesRegex(NotFound, "Vehicle not found."):
            service.build_summary(vehicle_ref=self.vehicle["vehicle_id"], authorization="Bearer token")


class VehicleOpsSummarySerializerTests(TestCase):
    def test_accepts_null_current_assignment_and_rejects_unknown_warning_codes(self):
        serializer = VehicleOpsSummarySerializer(
            data={
                "vehicle_id": "11111111-1111-1111-1111-111111111111",
                "route_no": 1,
                "plate_number": "12가3456",
                "vin": "KMH00000000000001",
                "vehicle_status": "active",
                "manufacturer_company": {
                    "company_id": "22222222-2222-2222-2222-222222222222",
                    "company_name": "Manufacturer Co",
                },
                "active_operator_company": {
                    "company_id": None,
                    "company_name": None,
                    "access_status": None,
                },
                "current_assignment": None,
                "current_terminal": None,
                "telemetry": {
                    "latest_location": {
                        "lat": None,
                        "lng": None,
                        "captured_at": None,
                        "snapshot_status": None,
                    },
                    "latest_diagnostic": {
                        "event_code": None,
                        "severity": None,
                        "event_status": None,
                        "captured_at": None,
                    },
                },
                "warnings": [
                    "current_terminal_missing",
                    "manufacturer_company_name_missing",
                    "unexpected_warning",
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertNotIn("current_assignment", serializer.errors)
        self.assertIn("warnings", serializer.errors)
