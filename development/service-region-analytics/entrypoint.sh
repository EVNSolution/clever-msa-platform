#!/bin/sh
set -eu

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

python manage.py migrate --noinput
exec gunicorn -w "${GUNICORN_WORKERS:-4}" -t "${GUNICORN_TIMEOUT:-120}" --bind 0.0.0.0:8000 config.wsgi:application
