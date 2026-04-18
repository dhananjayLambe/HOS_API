from django.urls import path, include
from rest_framework.routers import DefaultRouter

from consultations_core.api.views.preconsultation import (
    PreConsultationTemplateAPIView,
    CreateEncounterAPIView,
    EntryResolveAPIView,
    StartNewVisitAPIView,
    PreConsultationSectionAPIView,
    PreConsultationPreviousRecordsAPIView,
    StartPreConsultationAPIView,
    CompletePreConsultationAPIView,
    EncounterDetailAPIView,
    StartConsultationAPIView,
    CancelEncounterAPIView,
    PreConsultationPreviewAPIView,
)
from consultations_core.api.views.consultation import (
    EndConsultationAPIView,
    ConsultationSummaryAPIView,
    ConsultationSummaryLiteAPIView,
    ConsultationSummaryLiteHTMLAPIView,
    ConsultationSummaryLitePDFAPIView,
)
from consultations_core.api.views.instructions import (
    InstructionTemplatesAPIView,
    EncounterInstructionsListCreateAPIView,
    EncounterInstructionUpdateDeleteAPIView,
)
from consultations_core.api.views.instruction_suggestions import InstructionSuggestionsAPIView
from consultations_core.api.views.findings import (
    EncounterFindingsListCreateAPIView,
    ConsultationFindingUpdateDeleteAPIView,
)
from consultations_core.api.views.diagnosis import (
    EncounterCustomDiagnosisCreateAPIView,
)
from consultations_core.api.views.investigations import (
    ConsultationInvestigationItemDetailAPIView,
    ConsultationInvestigationItemsListCreateAPIView,
)
from consultations_core.api.views.clinical_template import ClinicalTemplateViewSet

router = DefaultRouter()

urlpatterns = [
    path("", include(router.urls)),
    path("pre-consult/template/", PreConsultationTemplateAPIView.as_view(), name="pre-consult-template"),
    path("pre-consult/encounter/create/", CreateEncounterAPIView.as_view(), name="pre-consult-create-encounter"),
    path("entry/resolve/", EntryResolveAPIView.as_view(), name="entry-resolve"),
    path("entry/start-new-visit/", StartNewVisitAPIView.as_view(), name="entry-start-new-visit"),
    path(
        "pre-consult/encounter/<uuid:encounter_id>/section/<str:section_code>/",
        PreConsultationSectionAPIView.as_view(),
        name="pre-consult-section",
    ),
    path(
        "pre-consult/patient/<uuid:patient_id>/previous-records/",
        PreConsultationPreviousRecordsAPIView.as_view(),
        name="pre-consult-previous-records",
    ),
    path(
        "pre-consultation/preview/",
        PreConsultationPreviewAPIView.as_view(),
        name="pre-consultation-preview",
    ),
    # Encounter lifecycle (pre-consultation → consultation redirect)
    path(
        "encounter/<uuid:encounter_id>/",
        EncounterDetailAPIView.as_view(),
        name="encounter-detail",
    ),
    path(
        "encounter/<uuid:encounter_id>/pre-consultation/start/",
        StartPreConsultationAPIView.as_view(),
        name="pre-consultation-start",
    ),
    path(
        "encounter/<uuid:encounter_id>/pre-consultation/complete/",
        CompletePreConsultationAPIView.as_view(),
        name="pre-consultation-complete",
    ),
    path(
        "encounter/<uuid:encounter_id>/consultation/start/",
        StartConsultationAPIView.as_view(),
        name="consultation-start",
    ),
    path(
        "encounter/<uuid:encounter_id>/consultation/complete/",
        EndConsultationAPIView.as_view(),
        name="consultation-complete",
    ),
    path(
        "encounter/<uuid:encounter_id>/cancel/",
        CancelEncounterAPIView.as_view(),
        name="encounter-cancel",
    ),
    # Instruction suggestions (JSON-backed, global)
    path(
        "instructions/suggestions/",
        InstructionSuggestionsAPIView.as_view(),
        name="instruction-suggestions",
    ),
    # Doctor-owned reusable clinical templates (list/create)
    path(
        "clinical-templates/",
        ClinicalTemplateViewSet.as_view({"get": "list", "post": "create"}),
        name="clinical-template-list-create",
    ),
    # Instruction templates and CRUD (encounter-scoped)
    path(
        "encounter/<uuid:encounter_id>/instructions/templates/",
        InstructionTemplatesAPIView.as_view(),
        name="instruction-templates",
    ),
    path(
        "encounter/<uuid:encounter_id>/instructions/",
        EncounterInstructionsListCreateAPIView.as_view(),
        name="encounter-instructions-list-create",
    ),
    path(
        "instructions/<uuid:pk>/",
        EncounterInstructionUpdateDeleteAPIView.as_view(),
        name="encounter-instruction-update-delete",
    ),
    path(
        "encounter/<uuid:encounter_id>/findings/",
        EncounterFindingsListCreateAPIView.as_view(),
        name="encounter-findings-list-create",
    ),
    path(
        "findings/<uuid:pk>/",
        ConsultationFindingUpdateDeleteAPIView.as_view(),
        name="consultation-finding-update-delete",
    ),
    path(
        "encounter/<uuid:encounter_id>/diagnoses/custom/",
        EncounterCustomDiagnosisCreateAPIView.as_view(),
        name="encounter-custom-diagnosis-create",
    ),
    path(
        "<uuid:consultation_id>/investigations/items/",
        ConsultationInvestigationItemsListCreateAPIView.as_view(),
        name="consultation-investigation-items",
    ),
    path(
        "<uuid:consultation_id>/investigations/items/<uuid:item_id>/",
        ConsultationInvestigationItemDetailAPIView.as_view(),
        name="consultation-investigation-item-detail",
    ),
    path(
        "<uuid:consultation_id>/summary/",
        ConsultationSummaryAPIView.as_view(),
        name="consultation-summary",
    ),
    path(
        "<uuid:consultation_id>/summary-lite/",
        ConsultationSummaryLiteAPIView.as_view(),
        name="consultation-summary-lite",
    ),
    path(
        "<uuid:consultation_id>/summary-lite/html/",
        ConsultationSummaryLiteHTMLAPIView.as_view(),
        name="consultation-summary-lite-html",
    ),
    path(
        "<uuid:consultation_id>/summary-lite/pdf/",
        ConsultationSummaryLitePDFAPIView.as_view(),
        name="consultation-summary-lite-pdf",
    ),
]