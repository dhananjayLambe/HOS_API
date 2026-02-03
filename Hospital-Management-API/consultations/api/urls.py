from django.urls import path,include
from rest_framework.routers import DefaultRouter
from consultations.api.views import (
    StartConsultationAPIView,
    EndConsultationAPIView,
    VitalsAPIView,
    AdviceTemplateListCreateAPIView,
    AdviceTemplateDetailAPIView,
    ComplaintAPIView,
    DiagnosisAPIView,
    AdviceAPIView,
    ConsultationSummaryView,
    GeneratePrescriptionPDFView,
    ConsultationHistoryAPIView,
    GlobalConsultationSearchView,
    TagConsultationView,
    PatientTimelineView,
    ListPrescriptionPDFsView,
    PatientFeedbackViewSet,
    FollowUpAPIView,
    PreConsultationTemplateAPIView,
    PreConsultationSectionAPIView,
    PreConsultationPreviousRecordsAPIView,
    CreateEncounterAPIView,
    test_pdf,
)
# urlpatterns = []
router = DefaultRouter()
router.register(r'feedbacks', PatientFeedbackViewSet, basename='feedback')

# urlpatterns += router.urls
urlpatterns = [
    path('', include(router.urls)),
    path('start/', StartConsultationAPIView.as_view(), name='start-consultation'),
    path('end/<uuid:consultation_id>/', EndConsultationAPIView.as_view(), name='end-consultation'),
    path('vitals/<uuid:consultation_id>/', VitalsAPIView.as_view(), name='consultation-vitals'),
    path('complaints/<uuid:consultation_id>/', ComplaintAPIView.as_view(), name='complaint-list-or-create'),
    path('complaints/<uuid:consultation_id>/<uuid:complaint_id>/', ComplaintAPIView.as_view(), name='complaint-detail'),
    path('diagnosis/<uuid:consultation_id>/', DiagnosisAPIView.as_view(), name='diagnosis-list-or-create'),
    path('diagnosis/<uuid:consultation_id>/<uuid:diagnosis_id>/', DiagnosisAPIView.as_view(), name='diagnosis-detail'),
    path('advice/templates/', AdviceTemplateListCreateAPIView.as_view(), name='advice-templates-list-create'),
    path('advice/templates/<uuid:template_id>/', AdviceTemplateDetailAPIView.as_view(), name='advice-template-detail'),
    path('advice/<uuid:consultation_id>/', AdviceAPIView.as_view(), name='advice-list-or-create'),
    path('advice/<uuid:consultation_id>/<uuid:advice_id>/', AdviceAPIView.as_view(), name='advice-detail'),
    path('follow-up/<uuid:consultation_id>/', FollowUpAPIView.as_view(), name='consultation-follow-up'),
    path('summary/<uuid:pk>/', ConsultationSummaryView.as_view(), name='consultation-summary'),
    path('test-pdf/',test_pdf, name='test-pdf'),
    path("generate-pdf/<uuid:consultation_id>/", GeneratePrescriptionPDFView.as_view(), name="generate-prescription-pdf"),
    path('pre-consult/template/', PreConsultationTemplateAPIView.as_view(), name='pre-consult-template'),
    path('pre-consult/encounter/create/', CreateEncounterAPIView.as_view(), name='pre-consult-create-encounter'),
    path('pre-consult/encounter/<uuid:encounter_id>/section/<str:section_code>/', PreConsultationSectionAPIView.as_view(), name='pre-consult-section'),
    path('pre-consult/patient/<uuid:patient_id>/previous-records/', PreConsultationPreviousRecordsAPIView.as_view(), name='pre-consult-previous-records'),
    
    #Meduical Records management API
    path('history/', ConsultationHistoryAPIView.as_view(), name='consultation-history'),
    path("global-consultation-search/", GlobalConsultationSearchView.as_view(), name="global-consultation-search"),
    path("tag/<uuid:consultation_id>/", TagConsultationView.as_view(), name="consultation-tag"),
    path('patient-timeline/<uuid:patient_id>/', PatientTimelineView.as_view(), name='patient-timeline'),
    path('list-patient-pdfs/<uuid:patient_id>/', ListPrescriptionPDFsView.as_view(), name='list-patient-pdfs'),
    
]


# Unique File Name
# RX_<PNR>_<YYYYMMDD_HHMM>.pdf
# Folder Structure
# prescriptions/<doctor_id>/<patient_id>/filename.pdf
#prescriptions/<doctor_id>/<patient_id>/<YYYY>/<MM>/filename.pdf
