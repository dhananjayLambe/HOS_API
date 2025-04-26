from django.urls import path
from consultations.api.views import StartConsultationAPIView


urlpatterns = [
     path('start/', StartConsultationAPIView.as_view(), name='start-consultation'),
]
