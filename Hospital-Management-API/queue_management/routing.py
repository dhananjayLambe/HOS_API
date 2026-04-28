from django.urls import re_path

from queue_management.consumers import QueueUpdatesConsumer

websocket_urlpatterns = [
    re_path(
        r"ws/queue-updates/(?P<clinic_id>[^/]+)/(?P<doctor_id>[^/]+)/(?P<queue_date>\d{4}-\d{2}-\d{2})/$",
        QueueUpdatesConsumer.as_asgi(),
    ),
]
