from django.urls import path,include
from rest_framework.routers import DefaultRouter

from consultations_core.api.views.preconsultation import (
    PreConsultationTemplateAPIView, CreateEncounterAPIView, 
    PreConsultationSectionAPIView, PreConsultationPreviousRecordsAPIView)


router = DefaultRouter()
#router.register(r'feedbacks', PatientFeedbackViewSet, basename='feedback')

# urlpatterns += router.urls
urlpatterns = [
    path('', include(router.urls)),
    path('pre-consult/template/', PreConsultationTemplateAPIView.as_view(), name='pre-consult-template'),
    path('pre-consult/encounter/create/', CreateEncounterAPIView.as_view(), name='pre-consult-create-encounter'),
    path('pre-consult/encounter/<uuid:encounter_id>/section/<str:section_code>/', PreConsultationSectionAPIView.as_view(), name='pre-consult-section'),
    path('pre-consult/patient/<uuid:patient_id>/previous-records/', PreConsultationPreviousRecordsAPIView.as_view(), name='pre-consult-previous-records'),
    
   
]