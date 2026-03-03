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
    EndConsultationAPIView,
    CancelEncounterAPIView,
    PreConsultationPreviewAPIView,
)
from consultations_core.api.views.instructions import (
    InstructionTemplatesAPIView,
    EncounterInstructionsListCreateAPIView,
    EncounterInstructionUpdateDeleteAPIView,
)

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
]