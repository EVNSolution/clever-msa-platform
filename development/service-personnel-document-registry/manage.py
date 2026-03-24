#!/usr/bin/env python
import os
import sys


def _uses_local_bootstrap(argv: list[str]) -> bool:
    if len(argv) < 2:
        return False
    return argv[1] in {"test", "makemigrations"}


def main() -> None:
    if _uses_local_bootstrap(sys.argv):
        os.environ.setdefault("PERSONNEL_DOCUMENT_TEST_MODE", "1")
        os.environ.setdefault("DJANGO_SECRET_KEY", "test-only-secret-key-please-replace-0001")
        os.environ.setdefault("JWT_SECRET_KEY", "test-only-jwt-secret-key-please-replace-0001")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
