from datetime import datetime, timezone
from importlib import import_module
from pathlib import Path

from django.core.exceptions import ValidationError
from django.test import TestCase


def _load_models_module(test_case: TestCase):
    try:
        return import_module("settlementregistry.models")
    except ModuleNotFoundError as exc:
        test_case.fail(f"settlementregistry.models module missing: {exc}")


class SettlementRegistryModelTests(TestCase):
    def test_initial_migration_file_exists(self):
        migration_path = Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.py"

        self.assertTrue(migration_path.exists())

    def test_settlement_policy_can_be_created_and_loaded(self):
        models_module = _load_models_module(self)

        policy = models_module.SettlementPolicy.objects.create(
            policy_code="fleet-standard",
            name="Fleet Standard",
            status=models_module.SettlementPolicy.Status.ACTIVE,
            description="Default fleet settlement policy.",
        )

        loaded = models_module.SettlementPolicy.objects.get(policy_id=policy.policy_id)

        self.assertEqual(loaded.policy_code, "fleet-standard")
        self.assertEqual(loaded.name, "Fleet Standard")
        self.assertEqual(loaded.status, models_module.SettlementPolicy.Status.ACTIVE)

    def test_policy_version_belongs_to_policy(self):
        models_module = _load_models_module(self)
        policy = models_module.SettlementPolicy.objects.create(
            policy_code="night-shift",
            name="Night Shift",
            status=models_module.SettlementPolicy.Status.ACTIVE,
        )

        version = models_module.SettlementPolicyVersion.objects.create(
            policy=policy,
            version_number=1,
            status=models_module.SettlementPolicyVersion.Status.DRAFT,
            rule_payload={"base_rate": 1000},
        )

        self.assertEqual(version.policy_id, policy.policy_id)
        self.assertEqual(policy.versions.get().policy_version_id, version.policy_version_id)

    def test_policy_version_number_is_unique_per_policy(self):
        models_module = _load_models_module(self)
        policy = models_module.SettlementPolicy.objects.create(
            policy_code="fleet-standard",
            name="Fleet Standard",
            status=models_module.SettlementPolicy.Status.ACTIVE,
        )
        models_module.SettlementPolicyVersion.objects.create(
            policy=policy,
            version_number=1,
            status=models_module.SettlementPolicyVersion.Status.DRAFT,
            rule_payload={"base_rate": 1000},
        )

        duplicate = models_module.SettlementPolicyVersion(
            policy=policy,
            version_number=1,
            status=models_module.SettlementPolicyVersion.Status.DRAFT,
            rule_payload={"base_rate": 1200},
        )

        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_published_policy_version_requires_published_at(self):
        models_module = _load_models_module(self)
        policy = models_module.SettlementPolicy.objects.create(
            policy_code="fleet-standard",
            name="Fleet Standard",
            status=models_module.SettlementPolicy.Status.ACTIVE,
        )
        version = models_module.SettlementPolicyVersion(
            policy=policy,
            version_number=2,
            status=models_module.SettlementPolicyVersion.Status.PUBLISHED,
            rule_payload={"base_rate": 1000},
            published_at=None,
        )

        with self.assertRaises(ValidationError) as context:
            version.full_clean()

        self.assertIn("published_at", context.exception.message_dict)

    def test_non_published_policy_version_cannot_set_published_at(self):
        models_module = _load_models_module(self)
        policy = models_module.SettlementPolicy.objects.create(
            policy_code="fleet-standard",
            name="Fleet Standard",
            status=models_module.SettlementPolicy.Status.ACTIVE,
        )
        version = models_module.SettlementPolicyVersion(
            policy=policy,
            version_number=3,
            status=models_module.SettlementPolicyVersion.Status.DRAFT,
            rule_payload={"base_rate": 1000},
            published_at=datetime(2026, 3, 24, 9, 0, tzinfo=timezone.utc),
        )

        with self.assertRaises(ValidationError) as context:
            version.full_clean()

        self.assertIn("published_at", context.exception.message_dict)
