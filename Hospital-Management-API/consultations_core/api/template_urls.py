from django.urls import include, path
from rest_framework.routers import DefaultRouter

from consultations_core.api.views.template_management import TemplateManagementViewSet

router = DefaultRouter()
router.register(r"", TemplateManagementViewSet, basename="v1-template")

urlpatterns = [
    path("", include(router.urls)),
]
