from importlib import import_module
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from deliveryrecords.models import DailyDeliveryInputSnapshot, DeliveryRecord


def _load_seed_module(test_case: TestCase):
    try:
        return import_module("deliveryrecords.management.commands.seed_delivery_records")
    except ModuleNotFoundError as exc:
        test_case.fail(f"seed_delivery_records command module missing: {exc}")


class SeedDeliveryRecordsCommandTests(TestCase):
    def test_seed_command_creates_delivery_record_and_snapshot(self):
        seed_module = _load_seed_module(self)
        stdout = StringIO()

        call_command("seed_delivery_records", stdout=stdout)

        record = DeliveryRecord.objects.get(
            delivery_record_id=seed_module.SAMPLE_DELIVERY_RECORD_ID
        )
        snapshot = DailyDeliveryInputSnapshot.objects.get(
            daily_delivery_input_snapshot_id=seed_module.SAMPLE_DAILY_SNAPSHOT_ID
        )

        self.assertEqual(DeliveryRecord.objects.count(), 1)
        self.assertEqual(DailyDeliveryInputSnapshot.objects.count(), 1)
        self.assertEqual(record.company_id, seed_module.SAMPLE_COMPANY_ID)
        self.assertEqual(record.fleet_id, seed_module.SAMPLE_FLEET_ID)
        self.assertEqual(record.driver_id, seed_module.SAMPLE_DRIVER_ID)
        self.assertEqual(snapshot.company_id, seed_module.SAMPLE_COMPANY_ID)
        self.assertEqual(snapshot.fleet_id, seed_module.SAMPLE_FLEET_ID)
        self.assertEqual(snapshot.driver_id, seed_module.SAMPLE_DRIVER_ID)
        self.assertIn("Seeded delivery record bootstrap data.", stdout.getvalue())

    def test_seed_command_is_idempotent(self):
        seed_module = _load_seed_module(self)

        call_command("seed_delivery_records", stdout=StringIO())
        first_record = DeliveryRecord.objects.get(
            delivery_record_id=seed_module.SAMPLE_DELIVERY_RECORD_ID
        )
        first_snapshot = DailyDeliveryInputSnapshot.objects.get(
            daily_delivery_input_snapshot_id=seed_module.SAMPLE_DAILY_SNAPSHOT_ID
        )

        call_command("seed_delivery_records", stdout=StringIO())

        self.assertEqual(DeliveryRecord.objects.count(), 1)
        self.assertEqual(DailyDeliveryInputSnapshot.objects.count(), 1)
        self.assertEqual(
            DeliveryRecord.objects.get(
                delivery_record_id=seed_module.SAMPLE_DELIVERY_RECORD_ID
            ).pk,
            first_record.pk,
        )
        self.assertEqual(
            DailyDeliveryInputSnapshot.objects.get(
                daily_delivery_input_snapshot_id=seed_module.SAMPLE_DAILY_SNAPSHOT_ID
            ).pk,
            first_snapshot.pk,
        )
