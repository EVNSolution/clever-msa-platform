from io import StringIO

from django.core.management import call_command
from django.test import TestCase


class MigrationStateTests(TestCase):
    def test_settlement_models_are_fully_reflected_in_migrations(self):
        try:
            call_command(
                "makemigrations",
                "settlements",
                check=True,
                dry_run=True,
                verbosity=0,
                stdout=StringIO(),
                stderr=StringIO(),
            )
        except SystemExit as exc:
            self.fail(f"makemigrations --check reported drift with exit code {exc.code}")
