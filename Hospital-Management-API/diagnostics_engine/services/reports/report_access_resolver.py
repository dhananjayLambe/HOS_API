"""Resolve report list/detail access for lab, doctor, and patient actors."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from django.shortcuts import get_object_or_404

from account.permissions import IsDoctor, IsPatient
from consultations_core.models.encounter import ClinicalEncounter
from labs.api.services.lab_session_resolver import LabSessionDenied, resolve_lab_user
from patient_account.models import PatientProfile


class ReportActorRole(str, Enum):
    LAB = "lab"
    DOCTOR = "doctor"
    PATIENT = "patient"
    ADMIN = "admin"


@dataclass(frozen=True)
class ReportListAccess:
    role: ReportActorRole
    branch_id: object | None = None
    patient_profile: PatientProfile | None = None
    encounter: ClinicalEncounter | None = None


def resolve_patient_profile_access(request, patient_id) -> ReportListAccess | None:
    patient = get_object_or_404(PatientProfile, pk=patient_id)

    if request.user.is_superuser:
        return ReportListAccess(role=ReportActorRole.ADMIN, patient_profile=patient)

    if IsPatient().has_permission(request, None):
        account_user_id = getattr(getattr(patient, "account", None), "user_id", None)
        if account_user_id == request.user.id:
            return ReportListAccess(role=ReportActorRole.PATIENT, patient_profile=patient)

    if IsDoctor().has_permission(request, None):
        from diagnostics_engine.models.reports import DiagnosticTestReport

        has_care = DiagnosticTestReport.objects.filter(
            order_test_line__order__patient_profile=patient,
            order_test_line__order__encounter__doctor__user_id=request.user.id,
        ).exists()
        if has_care:
            return ReportListAccess(role=ReportActorRole.DOCTOR, patient_profile=patient)

    resolved = resolve_lab_user(request)
    if not isinstance(resolved, LabSessionDenied):
        return ReportListAccess(
            role=ReportActorRole.LAB,
            branch_id=resolved.lab_user.branch_id,
            patient_profile=patient,
        )
    return None


def resolve_encounter_access(request, encounter_id) -> ReportListAccess | None:
    encounter = get_object_or_404(ClinicalEncounter, pk=encounter_id)

    if request.user.is_superuser:
        return ReportListAccess(role=ReportActorRole.ADMIN, encounter=encounter)

    doctor_user_id = getattr(getattr(encounter, "doctor", None), "user_id", None)
    if doctor_user_id and doctor_user_id == request.user.id:
        return ReportListAccess(role=ReportActorRole.DOCTOR, encounter=encounter)

    if IsPatient().has_permission(request, None):
        patient = getattr(encounter, "patient_profile", None)
        account_user_id = getattr(getattr(patient, "account", None), "user_id", None)
        if patient and account_user_id == request.user.id:
            return ReportListAccess(role=ReportActorRole.PATIENT, encounter=encounter)

    resolved = resolve_lab_user(request)
    if not isinstance(resolved, LabSessionDenied):
        return ReportListAccess(
            role=ReportActorRole.LAB,
            branch_id=resolved.lab_user.branch_id,
            encounter=encounter,
        )
    return None
