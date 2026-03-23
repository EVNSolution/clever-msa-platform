from rest_framework.exceptions import APIException, NotFound

from vehicleops.services.source_clients import (
    SourceClients,
    SourceNotFoundError,
    SourceServiceError,
)


class VehicleSummaryService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def _list_vehicles(self, *, authorization: str):
        try:
            vehicles = self.source_clients.list_vehicles(authorization=authorization)
        except SourceServiceError as exc:
            raise APIException("Vehicle asset service is unavailable.") from exc
        return self._normalize_collection(vehicles)

    def _get_vehicle(self, *, vehicle_id: str, authorization: str):
        try:
            vehicle = self.source_clients.get_vehicle(vehicle_id=vehicle_id, authorization=authorization)
        except SourceNotFoundError as exc:
            raise NotFound("Vehicle not found.") from exc
        except SourceServiceError as exc:
            raise APIException("Vehicle asset service is unavailable.") from exc
        if not vehicle:
            raise NotFound("Vehicle not found.")
        return vehicle

    def _build_company_map(self, *, authorization: str):
        try:
            companies = self.source_clients.list_companies(authorization=authorization)
        except SourceServiceError as exc:
            raise APIException("Organization master service is unavailable.") from exc
        return {
            str(company["company_id"]): company.get("name")
            for company in self._normalize_collection(companies)
            if company.get("company_id")
        }

    def _build_active_operator_access_map(self, *, authorization: str):
        try:
            operator_accesses = self.source_clients.list_active_operator_accesses(
                authorization=authorization
            )
        except SourceServiceError as exc:
            raise APIException("Vehicle asset service is unavailable.") from exc

        access_map = {}
        for access in self._normalize_collection(operator_accesses):
            if access.get("access_status") != "active":
                continue
            vehicle_id = access.get("vehicle_id")
            if vehicle_id:
                access_map[str(vehicle_id)] = access
        return access_map

    def _build_assignment_map(self, *, authorization: str):
        try:
            assignments = self.source_clients.list_assigned_assignments(
                authorization=authorization
            )
        except SourceServiceError as exc:
            raise APIException("Driver vehicle assignment service is unavailable.") from exc

        assignment_map = {}
        for assignment in self._normalize_collection(assignments):
            if assignment.get("assignment_status") != "assigned":
                continue
            vehicle_id = assignment.get("vehicle_id")
            if vehicle_id:
                assignment_map[str(vehicle_id)] = assignment
        return assignment_map

    def _build_terminal_map(self, *, authorization: str):
        try:
            terminals = self.source_clients.list_terminals(authorization=authorization)
        except SourceServiceError as exc:
            raise APIException("Terminal registry service is unavailable.") from exc

        return {
            str(terminal["terminal_id"]): terminal
            for terminal in self._normalize_collection(terminals)
            if terminal.get("terminal_id")
        }

    def _build_terminal_installation_map(self, *, authorization: str):
        try:
            installations = self.source_clients.list_installed_terminal_installations(
                authorization=authorization
            )
        except SourceServiceError as exc:
            raise APIException("Terminal registry service is unavailable.") from exc

        installation_map = {}
        for installation in self._normalize_collection(installations):
            if installation.get("installation_status") != "installed":
                continue
            vehicle_id = installation.get("vehicle_id")
            if vehicle_id:
                installation_map[str(vehicle_id)] = installation
        return installation_map

    def _build_summary(
        self,
        *,
        vehicle: dict,
        companies: dict,
        operator_accesses: dict,
        assignments: dict,
        terminals: dict,
        terminal_installations: dict,
    ):
        warnings = []
        vehicle_id = str(vehicle["vehicle_id"])

        manufacturer_company_id = self._string_or_none(vehicle.get("manufacturer_company_id"))
        manufacturer_company_name = companies.get(manufacturer_company_id)
        if manufacturer_company_id and manufacturer_company_name is None:
            warnings.append("manufacturer_company_name_missing")

        active_access = operator_accesses.get(vehicle_id)
        active_operator_company_id = self._string_or_none(
            active_access.get("operator_company_id") if active_access else None
        )
        active_operator_company_name = companies.get(active_operator_company_id)
        if active_operator_company_id and active_operator_company_name is None:
            warnings.append("active_operator_company_name_missing")

        assignment = assignments.get(vehicle_id)
        current_assignment = None
        if assignment is not None:
            current_assignment = {
                "driver_vehicle_assignment_id": assignment["driver_vehicle_assignment_id"],
                "driver_id": assignment["driver_id"],
                "assignment_status": assignment["assignment_status"],
                "assigned_at": assignment.get("assigned_at"),
            }

        current_terminal = self._build_current_terminal(
            vehicle_id=vehicle_id,
            terminal_installations=terminal_installations,
            terminals=terminals,
            warnings=warnings,
        )

        latest_location = self._build_latest_location(
            vehicle_id=vehicle_id,
            authorization=self._require_authorization(),
            warnings=warnings,
        )
        latest_diagnostic = self._build_latest_diagnostic(
            vehicle_id=vehicle_id,
            authorization=self._require_authorization(),
            warnings=warnings,
        )

        return {
            "vehicle_id": vehicle_id,
            "plate_number": vehicle["plate_number"],
            "vin": vehicle["vin"],
            "vehicle_status": vehicle["vehicle_status"],
            "manufacturer_company": {
                "company_id": manufacturer_company_id,
                "company_name": manufacturer_company_name,
            },
            "active_operator_company": {
                "company_id": active_operator_company_id,
                "company_name": active_operator_company_name,
                "access_status": active_access.get("access_status") if active_access else None,
            },
            "current_assignment": current_assignment,
            "current_terminal": current_terminal,
            "telemetry": {
                "latest_location": latest_location,
                "latest_diagnostic": latest_diagnostic,
            },
            "warnings": warnings,
        }

    def _build_current_terminal(
        self,
        *,
        vehicle_id: str,
        terminal_installations: dict,
        terminals: dict,
        warnings: list[str],
    ):
        installation = terminal_installations.get(vehicle_id)
        if installation is None:
            warnings.append("current_terminal_missing")
            return None

        terminal_id = self._string_or_none(installation.get("terminal_id"))
        terminal = terminals.get(terminal_id) if terminal_id else None
        if terminal is None:
            warnings.append("current_terminal_unavailable")
            return {
                "terminal_id": terminal_id,
                "installation_status": installation.get("installation_status"),
                "installed_at": installation.get("installed_at"),
                "imei": None,
                "iccid": None,
                "firmware_version": None,
                "protocol_version": None,
                "app_version": None,
            }

        return {
            "terminal_id": terminal_id,
            "installation_status": installation.get("installation_status"),
            "installed_at": installation.get("installed_at"),
            "imei": terminal.get("imei"),
            "iccid": terminal.get("iccid"),
            "firmware_version": terminal.get("firmware_version"),
            "protocol_version": terminal.get("protocol_version"),
            "app_version": terminal.get("app_version"),
        }

    def _build_latest_location(self, *, vehicle_id: str, authorization: str, warnings: list[str]):
        try:
            latest_location = self.source_clients.get_latest_vehicle_location(
                vehicle_id=vehicle_id,
                authorization=authorization,
            )
        except SourceServiceError as exc:
            raise APIException("Telemetry hub service is unavailable.") from exc

        if not latest_location:
            warnings.append("latest_location_missing")
            return {
                "lat": None,
                "lng": None,
                "captured_at": None,
                "snapshot_status": None,
            }

        return {
            "lat": latest_location.get("lat"),
            "lng": latest_location.get("lng"),
            "captured_at": latest_location.get("captured_at"),
            "snapshot_status": latest_location.get("snapshot_status"),
        }

    def _build_latest_diagnostic(self, *, vehicle_id: str, authorization: str, warnings: list[str]):
        try:
            latest_diagnostics = self.source_clients.list_latest_vehicle_diagnostics(
                vehicle_id=vehicle_id,
                authorization=authorization,
            )
        except SourceServiceError as exc:
            raise APIException("Telemetry hub service is unavailable.") from exc

        diagnostics = self._normalize_collection(latest_diagnostics)
        latest_diagnostic = diagnostics[0] if diagnostics else None
        if latest_diagnostic is None:
            warnings.append("latest_diagnostic_missing")
            return {
                "event_code": None,
                "severity": None,
                "event_status": None,
                "captured_at": None,
            }

        return {
            "event_code": latest_diagnostic.get("event_code"),
            "severity": latest_diagnostic.get("severity"),
            "event_status": latest_diagnostic.get("event_status"),
            "captured_at": latest_diagnostic.get("captured_at"),
        }

    def _require_authorization(self):
        return getattr(self, "_authorization", "")

    def list_summaries(self, *, authorization: str):
        self._authorization = authorization
        try:
            vehicles = self._list_vehicles(authorization=authorization)
            companies = self._build_company_map(authorization=authorization)
            operator_accesses = self._build_active_operator_access_map(authorization=authorization)
            assignments = self._build_assignment_map(authorization=authorization)
            terminals = self._build_terminal_map(authorization=authorization)
            terminal_installations = self._build_terminal_installation_map(
                authorization=authorization
            )
            return [
                self._build_summary(
                    vehicle=vehicle,
                    companies=companies,
                    operator_accesses=operator_accesses,
                    assignments=assignments,
                    terminals=terminals,
                    terminal_installations=terminal_installations,
                )
                for vehicle in vehicles
            ]
        finally:
            self._authorization = ""

    def build_summary(self, *, vehicle_id: str, authorization: str):
        self._authorization = authorization
        try:
            vehicle = self._get_vehicle(vehicle_id=vehicle_id, authorization=authorization)
            companies = self._build_company_map(authorization=authorization)
            operator_accesses = self._build_active_operator_access_map(authorization=authorization)
            assignments = self._build_assignment_map(authorization=authorization)
            terminals = self._build_terminal_map(authorization=authorization)
            terminal_installations = self._build_terminal_installation_map(
                authorization=authorization
            )
            return self._build_summary(
                vehicle=vehicle,
                companies=companies,
                operator_accesses=operator_accesses,
                assignments=assignments,
                terminals=terminals,
                terminal_installations=terminal_installations,
            )
        finally:
            self._authorization = ""

    def _normalize_collection(self, payload):
        if payload is None:
            return []
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            results = payload.get("results")
            if isinstance(results, list):
                return results
        return [payload]

    def _string_or_none(self, value):
        if value is None:
            return None
        return str(value)
