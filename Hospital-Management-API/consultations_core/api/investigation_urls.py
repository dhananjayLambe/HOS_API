from django.urls import path

from consultations_core.api.views.investigations import CustomInvestigationCreateAPIView

urlpatterns = [
    path("custom/", CustomInvestigationCreateAPIView.as_view(), name="investigations-custom-create"),
]
