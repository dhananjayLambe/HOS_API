import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'main.settings')

app = Celery('main')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
from django.conf import settings as django_settings

app.conf.timezone = django_settings.TIME_ZONE
app.conf.enable_utc = True
@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')