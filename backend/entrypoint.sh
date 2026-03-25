#!/bin/bash
set -e

export DJANGO_SETTINGS_MODULE=gomatch_api.settings

echo "=== GoMatch API Starting ==="
echo "DJANGO_SETTINGS_MODULE=$DJANGO_SETTINGS_MODULE"
echo "PORT=$PORT"
echo "RAILWAY_ENVIRONMENT=$RAILWAY_ENVIRONMENT"
echo "DJANGO_DEBUG=$DJANGO_DEBUG"

# Run migrations (non-fatal: app starts even if migrations fail)
echo "Running migrations..."
python manage.py migrate --noinput || echo "WARNING: migrations failed, continuing..."

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "WARNING: collectstatic failed, continuing..."

# Start gunicorn on the port Railway assigns (default 8000)
PORT="${PORT:-8000}"
echo "Starting gunicorn on 0.0.0.0:$PORT ..."
exec gunicorn gomatch_api.wsgi:application \
    --bind "0.0.0.0:$PORT" \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
