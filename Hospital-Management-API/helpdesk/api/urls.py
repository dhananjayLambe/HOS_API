from django.urls import path
from .views import (
    CreateHelpdeskAPIView,
    ListHelpdeskAPIView,
    DeleteHelpdeskAPIView
)
from rest_framework_simplejwt.views import TokenRefreshView

app_name='helpdesk'

urlpatterns = [
    path("create/", CreateHelpdeskAPIView.as_view(), name="create-helpdesk"),
    path("list/", ListHelpdeskAPIView.as_view(), name="list-helpdesk"),
    path("<uuid:pk>/delete/", DeleteHelpdeskAPIView.as_view(), name="delete-helpdesk"),
]