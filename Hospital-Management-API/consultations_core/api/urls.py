from django.urls import path, include
from rest_framework.routers import DefaultRouter

from consultations_core.api.views.preconsultation import (
    PreConsultationTemplateAPIView,
    CreateEncounterAPIView,
    PreConsultationSectionAPIView,
    PreConsultationPreviousRecordsAPIView,
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