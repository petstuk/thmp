from __future__ import annotations

import os

from celery import Celery

BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0")

celery_app = Celery("thmp_reporting", broker=BROKER_URL, backend=BROKER_URL)
celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    beat_schedule={
        "tick-report-schedules": {
            "task": "app.tasks.tick_schedules",
            "schedule": 60.0,
        }
    },
)
