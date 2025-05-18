from django.urls import path
from consultations.api.views import(
    StartConsultationAPIView,
    EndConsultationAPIView,
    VitalsAPIView,AdviceTemplateListAPIView,
    ComplaintAPIView,DiagnosisAPIView,AdviceAPIView,ConsultationSummaryView
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
]
