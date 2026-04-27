from rest_framework.exceptions import APIException, NotFound

from driver360.services.source_clients import (
    SourceClients,
    SourceNotFoundError,
    SourceServiceError,
)


class DriverSummaryService:
    REQUIRED_PERSONNEL_DOCUMENT_TYPES = (
        "contract",
        "license_or_certificate",
        "bank_account_proof",
        "business_registration",
    )

    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def build_summary(self, *, driver_ref: str, authorization: str):
        warnings = []
        cleanup_blockers = []
        driver = self._get_driver(driver_ref=driver_ref, authorization=authorization)
        driver_id = driver["driver_id"]

        companies = self.source_clients.list_companies(authorization=authorization)
        company = next((item for item in companies if item["company_id"] == driver["company_id"]), None)
        if company is None:
            warnings.append(f"Company not found for company_id={driver['company_id']}.")
            cleanup_blockers.append("Company scope is missing.")

        fleets = self.source_clients.list_fleets(authorization=authorization)
        fleet = next((item for item in fleets if item["fleet_id"] == driver["fleet_id"]), None)
        if fleet is None:
            warnings.append(f"Fleet not found for fleet_id={driver['fleet_id']}.")
            cleanup_blockers.append("Fleet scope is missing.")

        driver_account_link = self._get_driver_account_link(
            driver_id=driver_id,
            authorization=authorization,
            warnings=warnings,
        )
        if driver["employment_status"] != "active":
            cleanup_blockers.append(
                f"Employment status is {driver['employment_status']}."
            )
        if driver["qualification_status"] != "qualified":
            cleanup_blockers.append(
                f"Qualification status is {driver['qualification_status']}."
            )
        if driver_account_link is None:
            cleanup_blockers.append("Linked driver account is missing.")

        personnel_documents = self._get_personnel_documents(
            driver_id=driver_id,
            authorization=authorization,
            warnings=warnings,
        )
        active_personnel_document_types: list[str] = []
        missing_personnel_document_types: list[str] = []
        if personnel_documents is not None:
            active_personnel_document_types = sorted(
                {
                    document["document_type"]
                    for document in personnel_documents
                    if document.get("status") == "active"
                }
            )
            missing_personnel_document_types = [
                document_type
                for document_type in self.REQUIRED_PERSONNEL_DOCUMENT_TYPES
                if document_type not in active_personnel_document_types
            ]
            if missing_personnel_document_types:
                cleanup_blockers.append(
                    "Missing active personnel documents: "
                    + ", ".join(missing_personnel_document_types)
                    + "."
                )

        latest_settlement = self._get_latest_settlement(
            driver_id=driver_id,
            authorization=authorization,
            warnings=warnings,
        )
        driver_cleanup_status = "unavailable" if personnel_documents is None else "ready"
        if personnel_documents is not None and cleanup_blockers:
            driver_cleanup_status = "action_required"

        return {
            "driver_id": driver["driver_id"],
            "driver_name": driver["name"],
            "ev_id": driver["ev_id"],
            "phone_number": driver["phone_number"],
            "address": driver["address"],
            "company_id": driver["company_id"],
            "company_name": company["name"] if company else None,
            "fleet_id": driver["fleet_id"],
            "fleet_name": fleet["name"] if fleet else None,
            "employment_status": driver["employment_status"],
            "qualification_status": driver["qualification_status"],
            "driver_account_link_id": driver_account_link["driver_account_link_id"] if driver_account_link else None,
            "driver_account_id": driver_account_link["driver_account_id"] if driver_account_link else None,
            "driver_account_identity_name": driver_account_link["identity_name"] if driver_account_link else None,
            "driver_account_email": driver_account_link["email"] if driver_account_link else None,
            "driver_account_status": driver_account_link["account_status"] if driver_account_link else None,
            "latest_settlement_run_id": latest_settlement["settlement_run_id"] if latest_settlement else None,
            "latest_settlement_period_start": latest_settlement["period_start"] if latest_settlement else None,
            "latest_settlement_period_end": latest_settlement["period_end"] if latest_settlement else None,
            "latest_settlement_status": latest_settlement["status"] if latest_settlement else None,
            "latest_payout_status": latest_settlement["payout_status"] if latest_settlement else None,
            "latest_settlement_amount": latest_settlement["amount"] if latest_settlement else None,
            "driver_cleanup_status": driver_cleanup_status,
            "cleanup_blockers": cleanup_blockers,
            "active_personnel_document_types": active_personnel_document_types,
            "missing_personnel_document_types": missing_personnel_document_types,
            "attendance_rule_status": "pending_source",
            "delivery_history_rule_status": "source_input_only",
            "warnings": warnings,
        }

    def _get_driver(self, *, driver_ref: str, authorization: str):
        try:
            driver = self.source_clients.get_driver(driver_ref=driver_ref, authorization=authorization)
        except SourceNotFoundError as exc:
            raise NotFound("Driver not found.") from exc
        except SourceServiceError as exc:
            raise APIException("Driver profile service is unavailable.") from exc
        if not driver:
            raise NotFound("Driver not found.")
        return driver

    def _get_driver_account_link(self, *, driver_id: str, authorization: str, warnings: list[str]):
        try:
            links = self.source_clients.list_driver_account_links(
                driver_id=driver_id,
                authorization=authorization,
            )
        except SourceServiceError:
            warnings.append("Driver account link source unavailable.")
            return None
        if not links:
            return None
        return links[0]

    def _get_latest_settlement(self, *, driver_id: str, authorization: str, warnings: list[str]):
        try:
            payload = self.source_clients.get_latest_settlement(
                driver_id=driver_id,
                authorization=authorization,
            )
        except SourceServiceError:
            warnings.append("Settlement source unavailable.")
            return None

        return payload.get("latest_settlement")

    def _get_personnel_documents(self, *, driver_id: str, authorization: str, warnings: list[str]):
        try:
            return self.source_clients.list_personnel_documents(
                driver_id=driver_id,
                authorization=authorization,
            )
        except SourceServiceError:
            warnings.append("Personnel document source unavailable.")
            return None
