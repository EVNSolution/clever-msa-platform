from rest_framework.exceptions import APIException, NotFound

from driver360.services.source_clients import (
    SourceClients,
    SourceNotFoundError,
    SourceServiceError,
)


class DriverSummaryService:
    def __init__(self, source_clients=None):
        self.source_clients = source_clients or SourceClients()

    def build_summary(self, *, driver_id: str, authorization: str):
        warnings = []
        driver = self._get_driver(driver_id=driver_id, authorization=authorization)

        companies = self.source_clients.list_companies(authorization=authorization)
        company = next((item for item in companies if item["company_id"] == driver["company_id"]), None)
        if company is None:
            warnings.append(f"Company not found for company_id={driver['company_id']}.")

        fleets = self.source_clients.list_fleets(authorization=authorization)
        fleet = next((item for item in fleets if item["fleet_id"] == driver["fleet_id"]), None)
        if fleet is None:
            warnings.append(f"Fleet not found for fleet_id={driver['fleet_id']}.")

        account = self._get_account(
            account_id=driver.get("account_id"),
            authorization=authorization,
            warnings=warnings,
        )
        latest_settlement = self._get_latest_settlement(
            driver_id=driver_id,
            authorization=authorization,
            warnings=warnings,
        )

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
            runs = self.source_clients.list_settlement_runs(authorization=authorization)
            items = self.source_clients.list_settlement_items(authorization=authorization)
        except SourceServiceError:
            warnings.append("Settlement source unavailable.")
            return None

        run_map = {run["settlement_run_id"]: run for run in runs}
        matches = []
        for item in items:
            if item.get("driver_id") != driver_id:
                continue
            run = run_map.get(item.get("settlement_run_id"))
            if run is None:
                continue
            matches.append(
                {
                    "settlement_run_id": run["settlement_run_id"],
                    "period_start": run["period_start"],
                    "period_end": run["period_end"],
                    "status": run["status"],
                    "payout_status": item["payout_status"],
                    "amount": item["amount"],
                }
            )

        if not matches:
            return None

        return max(matches, key=lambda item: (item["period_end"], item["settlement_run_id"]))
