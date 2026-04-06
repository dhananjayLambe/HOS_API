from django.urls import path

from medicines.api.views.hybrid import MedicineHybridAPIView
from medicines.api.views.suggestions import MedicineSuggestionsAPIView

urlpatterns = [
    path("suggestions/", MedicineSuggestionsAPIView.as_view(), name="medicine-suggestions"),
    path("hybrid/", MedicineHybridAPIView.as_view(), name="medicine-hybrid"),
]


#TBD
# add medicines after end of consultation
# add custom medicines after end of consultation