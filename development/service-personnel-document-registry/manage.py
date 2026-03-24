#!/usr/bin/env python
import os
import sys


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        os.environ.setdefault("DJANGO_SECRET_KEY", "test-only-secret-key-please-replace-0001")
        os.environ.setdefault("JWT_SECRET_KEY", "test-only-jwt-secret-key-please-replace-0001")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
