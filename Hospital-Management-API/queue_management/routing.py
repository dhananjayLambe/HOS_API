from django.urls import re_path

from queue_management.consumers import QueueUpdatesConsumer

websocket_urlpatterns = [
    re_path(
        r"ws/queue-updates/(?P<clinic_id>[^/]+)/(?P<doctor_id>[^/]+)/$",
        QueueUpdatesConsumer.as_asgi(),
    ),
]
