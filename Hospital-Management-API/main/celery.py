import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'main.settings')

app = Celery('main')
app.config_from_object('django.conf:settings', namespace='CELERY')

from shared.logging.celery_context import (
    LogContextPropagationTask,
    register_celery_context_signals,
)

app.Task = LogContextPropagationTask
app.autodiscover_tasks()
from django.conf import settings as django_settings

app.conf.timezone = django_settings.TIME_ZONE
app.conf.enable_utc = True

from shared.logging.factory import configure_logging

configure_logging(django_settings.DOCTORPROCARE_LOGGING_CONFIG)

register_celery_context_signals()


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
