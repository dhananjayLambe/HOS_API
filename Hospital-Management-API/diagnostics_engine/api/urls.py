from django.urls import include, path
from rest_framework.routers import DefaultRouter

# Register viewsets on `router` and add explicit paths below (see consultations_core.api.urls).

router = DefaultRouter()

urlpatterns = [
    path("", include(router.urls)),
]
