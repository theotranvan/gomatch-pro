FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=gomatch_api.settings
ENV CELERY_TASK_ALWAYS_EAGER=False

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

COPY backend/supervisord.conf /etc/supervisord.conf

EXPOSE 8000

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
