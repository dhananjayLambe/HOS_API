from django.urls import include, path
from rest_framework.routers import DefaultRouter

from labs.api.views.lab_onboarding import LabOnboardingView

router = DefaultRouter()

urlpatterns = [
    path("", include(router.urls)),
    path("investigations/", include("labs.api.investigation_urls")),
    path("onboarding/", LabOnboardingView.as_view(), name="lab-onboarding"),
]
