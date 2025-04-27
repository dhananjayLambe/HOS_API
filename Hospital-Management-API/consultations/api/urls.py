from django.urls import path
from consultations.api.views import(
    StartConsultationAPIView,
    EndConsultationAPIView,
    VitalsAPIView)


urlpatterns = [
    path('start/', StartConsultationAPIView.as_view(), name='start-consultation'),
    path('end/<uuid:consultation_id>/', EndConsultationAPIView.as_view(), name='end-consultation'),
    path('vitals/<uuid:consultation_id>/', VitalsAPIView.as_view(), name='consultation-vitals'),
]
