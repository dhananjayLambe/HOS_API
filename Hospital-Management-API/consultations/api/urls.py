from django.urls import path
from consultations.api.views import(
    StartConsultationAPIView,
    EndConsultationAPIView)


urlpatterns = [
    path('start/', StartConsultationAPIView.as_view(), name='start-consultation'),
    path('end/<uuid:consultation_id>/', EndConsultationAPIView.as_view(), name='end-consultation'),
]
