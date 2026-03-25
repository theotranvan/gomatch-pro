#!/bin/bash
set -e

echo "=== GoMatch API Starting ==="

# Run migrations (non-fatal: app starts even if migrations fail)
echo "Running migrations..."
python manage.py migrate --noinput || echo "WARNING: migrations failed, continuing..."

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "WARNING: collectstatic failed, continuing..."

# Start gunicorn on the port Railway assigns (default 8000)
PORT="${PORT:-8000}"
echo "Starting gunicorn on port $PORT..."
exec gunicorn gomatch_api.wsgi:application \
    --bind "0.0.0.0:$PORT" \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
