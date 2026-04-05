from django.urls import path

from medicines.api.views.suggestions import MedicineSuggestionsAPIView

urlpatterns = [
    path("suggestions/", MedicineSuggestionsAPIView.as_view(), name="medicine-suggestions"),
]
