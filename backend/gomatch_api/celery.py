"""
Celery configuration for gomatch_api project.
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gomatch_api.settings")

app = Celery("gomatch_api")

# Read config from Django settings, namespace CELERY_
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()
