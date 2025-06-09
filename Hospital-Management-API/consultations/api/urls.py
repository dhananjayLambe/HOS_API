from django.urls import path
from consultations.api.views import(
    StartConsultationAPIView,
    EndConsultationAPIView,
    VitalsAPIView,AdviceTemplateListAPIView,
    ComplaintAPIView,DiagnosisAPIView,AdviceAPIView,ConsultationSummaryView,
    GeneratePrescriptionPDFView,ConsultationHistoryAPIView,
    GlobalConsultationSearchView,TagConsultationView,
    PatientTimelineView,ListPrescriptionPDFsView,
    test_pdf
    )


urlpatterns = [
    path('start/', StartConsultationAPIView.as_view(), name='start-consultation'),
    path('end/<uuid:consultation_id>/', EndConsultationAPIView.as_view(), name='end-consultation'),
    path('vitals/<uuid:consultation_id>/', VitalsAPIView.as_view(), name='consultation-vitals'),
    path('complaints/<uuid:consultation_id>/', ComplaintAPIView.as_view(), name='complaint-create'),
    path('complaints-update-delete/<uuid:consultation_id>/<uuid:complaint_id>/', ComplaintAPIView.as_view(), name='complaint-update-delete'),
    path('diagnosis/<uuid:consultation_id>/', DiagnosisAPIView.as_view(), name='diagnosis-create'),
    path('diagnosis-update-delete/<uuid:consultation_id>/<uuid:diagnosis_id>/', DiagnosisAPIView.as_view(), name='diagnosis-update-delete'),
    path('advice/templates/', AdviceTemplateListAPIView.as_view(), name='advice-templates-list'),
    path('advice/<uuid:consultation_id>/', AdviceAPIView.as_view(), name='advice-create'),
    path('advice-update-delete/<uuid:consultation_id>/<uuid:advice_id>/', AdviceAPIView.as_view(), name='advice-update-delete'),
    path('summary/<uuid:pk>/', ConsultationSummaryView.as_view(), name='consultation-summary'),
    path('test-pdf/',test_pdf, name='test-pdf'),
    path("generate-pdf/<uuid:consultation_id>/", GeneratePrescriptionPDFView.as_view(), name="generate-prescription-pdf"),
    
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
