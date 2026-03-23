import json
from datetime import date, datetime, timedelta, timezone
from urllib.request import Request, urlopen
from uuid import UUID

import jwt
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from settlements.models import SettlementItem, SettlementRun


SAMPLE_SETTLEMENT_RUN_ID = UUID("60000000-0000-0000-0000-000000000001")
SAMPLE_SETTLEMENT_ITEM_ID = UUID("70000000-0000-0000-0000-000000000001")
SAMPLE_COMPANY_ID = UUID("30000000-0000-0000-0000-000000000001")
SAMPLE_FLEET_ID = UUID("40000000-0000-0000-0000-000000000001")
SAMPLE_COMPANY_NAME = "Seed Company"
SAMPLE_FLEET_NAME = "Seed Fleet"
SAMPLE_DRIVER_ID = UUID("10000000-0000-0000-0000-000000000001")


def _build_bootstrap_authorization() -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "email": "seed-runner@example.com",
        "role": "admin",
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
        "jti": "00000000-0000-0000-0000-000000000002",
        "type": "access",
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return f"Bearer {token}"


def _fetch_json(url: str, *, authorization: str):
    request = Request(url, headers={"Authorization": authorization, "Accept": "application/json"})
    with urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def _pick_seeded_record(records, *, kind: str, field_name: str, expected_value):
    for record in records:
        if record.get(field_name) == expected_value:
            return record
    raise CommandError(
        f"Could not find the seeded {kind} record with {field_name}={expected_value!r}."
    )


class Command(BaseCommand):
    help = "Create or update placeholder settlement bootstrap data."

    def handle(self, *args, **options):
        authorization = _build_bootstrap_authorization()
        companies = _fetch_json(
            f"{settings.SETTLEMENT_ORG_BASE_URL}/companies/",
            authorization=authorization,
        )
        company = _pick_seeded_record(
            companies,
            kind="company",
            field_name="company_id",
            expected_value=str(SAMPLE_COMPANY_ID),
        )

        fleets = _fetch_json(
            f"{settings.SETTLEMENT_ORG_BASE_URL}/fleets/",
            authorization=authorization,
        )
        fleet = _pick_seeded_record(
            [record for record in fleets if record.get("company_id") == company["company_id"]],
            kind="fleet",
            field_name="fleet_id",
            expected_value=str(SAMPLE_FLEET_ID),
        )

        drivers = _fetch_json(
            f"{settings.SETTLEMENT_DRIVER_BASE_URL}/",
            authorization=authorization,
        )
        driver = _pick_seeded_record(
            [
                record
                for record in drivers
                if record.get("company_id") == company["company_id"]
                and record.get("fleet_id") == fleet["fleet_id"]
            ],
            kind="driver",
            field_name="driver_id",
            expected_value=str(SAMPLE_DRIVER_ID),
        )

        settlement_run = SettlementRun.objects.update_or_create(
            settlement_run_id=SAMPLE_SETTLEMENT_RUN_ID,
            defaults={
                "company_id": company["company_id"],
                "fleet_id": fleet["fleet_id"],
                "period_start": date(2026, 3, 1),
                "period_end": date(2026, 3, 31),
                "status": "draft",
            },
        )[0]
        SettlementItem.objects.update_or_create(
            settlement_item_id=SAMPLE_SETTLEMENT_ITEM_ID,
            defaults={
                "settlement_run_id": settlement_run.settlement_run_id,
                "driver_id": driver["driver_id"],
                "amount": "125000.50",
                "payout_status": "pending",
            },
        )
        self.stdout.write(self.style.SUCCESS("Seeded placeholder settlement data."))
