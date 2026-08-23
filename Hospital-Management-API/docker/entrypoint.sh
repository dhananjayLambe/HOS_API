#!/bin/sh
set -eu

# Do not run migrations or collectstatic here. Deployment scripts run those once.

if [ "$(id -u)" = "0" ]; then
    mkdir -p /app/staticfiles /app/logs /app/media
    chown -R appuser:appuser /app/staticfiles /app/logs /app/media
    exec gosu appuser "$0" "$@"
fi

exec "$@"
