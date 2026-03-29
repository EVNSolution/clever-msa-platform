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

    def build_summary(self, *, driver_id: str, authorization: str):
        warnings = []
        cleanup_blockers = []
        driver = self._get_driver(driver_id=driver_id, authorization=authorization)

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

        account = self._get_account(
            account_id=driver.get("account_id"),
            authorization=authorization,
            warnings=warnings,
        )
        if not driver.get("account_id"):
            cleanup_blockers.append("Linked account is missing.")
        elif account is None:
            cleanup_blockers.append(f"Linked account record not found for account_id={driver['account_id']}.")

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
            "account_id": account["account_id"] if account else None,
            "account_email": account["email"] if account else None,
            "account_role": account["role"] if account else None,
            "account_is_active": account["is_active"] if account else None,
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

    def _get_driver(self, *, driver_id: str, authorization: str):
        try:
            driver = self.source_clients.get_driver(driver_id=driver_id, authorization=authorization)
        except SourceNotFoundError as exc:
            raise NotFound("Driver not found.") from exc
        except SourceServiceError as exc:
            raise APIException("Driver profile service is unavailable.") from exc
        if not driver:
            raise NotFound("Driver not found.")
        return driver

    def _get_account(self, *, account_id: str | None, authorization: str, warnings: list[str]):
        if not account_id:
            return None
        try:
            account = self.source_clients.get_account(account_id=account_id, authorization=authorization)
        except SourceNotFoundError:
            warnings.append(f"Account not found for account_id={account_id}.")
            return None
        except SourceServiceError:
            warnings.append("Account source unavailable.")
            return None
        if not account:
            warnings.append(f"Account not found for account_id={account_id}.")
            return None
        return account

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
