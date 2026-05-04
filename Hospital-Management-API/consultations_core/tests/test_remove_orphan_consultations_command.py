"""Tests for remove_orphan_consultations management command."""

from __future__ import annotations

import io
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from clinic.models import Clinic
from consultations_core.management.commands.remove_orphan_consultations import (
    collect_empty_pre_phase_encounter_pks,
    queryset_stranded,
)
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.pre_consultation import PreConsultation, PreConsultationVitals
from consultations_core.services.consultation_start_service import start_consultation_for_encounter
from consultations_core.services.encounter_service import EncounterService
from consultations_core.services.encounter_state_machine import EncounterStateMachine
from consultations_core.services.preconsultation_service import PreConsultationService
from doctor.models import doctor
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _minimal_encounter():
    clinic = Clinic.objects.create(name=f"Orphan clinic {uuid.uuid4().hex[:8]}")
    patient_user = User.objects.create_user(
        username=f"pat_orph_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    account = PatientAccount.objects.create(user=patient_user)
    account.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=account,
        first_name="P",
        last_name="Test",
        relation="self",
        gender="male",
        age_years=30,
    )
    doc_user = User.objects.create_user(
        username=f"doc_orph_{uuid.uuid4().hex[:10]}",
        password="testpass123",
        first_name="Doc",
        last_name="Test",
    )
    g, _ = Group.objects.get_or_create(name="doctor")
    doc_user.groups.add(g)
    doc = doctor.objects.create(user=doc_user, primary_specialization="physician")
    doc.clinics.add(clinic)
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=account,
        patient_profile=profile,
        doctor=doc,
    )
    return encounter


class RemoveOrphanConsultationsCommandTests(TestCase):
    def test_empty_draft_dry_run_leaves_consultation(self):
        encounter = _minimal_encounter()
        start_consultation_for_encounter(encounter_id=encounter.id, user=None, source="test")
        self.assertTrue(Consultation.objects.filter(encounter=encounter).exists())

        out = io.StringIO()
        call_command("remove_orphan_consultations", "--kind=empty-draft", stdout=out)
        self.assertIn("Would remove", out.getvalue())
        self.assertTrue(Consultation.objects.filter(encounter=encounter).exists())

    def test_empty_draft_apply_removes_consultation_and_cancels_encounter(self):
        encounter = _minimal_encounter()
        start_consultation_for_encounter(encounter_id=encounter.id, user=None, source="test")
        cid = Consultation.objects.get(encounter=encounter).pk

        out = io.StringIO()
        call_command("remove_orphan_consultations", "--kind=empty-draft", "--apply", stdout=out)
        self.assertIn("Removed", out.getvalue())
        self.assertFalse(Consultation.objects.filter(pk=cid).exists())
        encounter.refresh_from_db()
        self.assertEqual(encounter.status, "cancelled")
        self.assertFalse(encounter.is_active)

    def test_stranded_apply_deletes_consultation_on_cancelled_encounter(self):
        encounter = _minimal_encounter()
        start_consultation_for_encounter(encounter_id=encounter.id, user=None, source="test")
        cid = Consultation.objects.get(encounter=encounter).pk
        # Simulate inconsistent DB: terminal encounter but consultation row left
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(
            status="cancelled",
            is_active=False,
        )
        self.assertTrue(Consultation.objects.filter(pk=cid).exists())
        self.assertEqual(queryset_stranded().filter(pk=cid).count(), 1)

        out = io.StringIO()
        call_command("remove_orphan_consultations", "--kind=stranded", "--apply", stdout=out)
        self.assertIn("Removed", out.getvalue())
        self.assertFalse(Consultation.objects.filter(pk=cid).exists())

    def _encounter_old_enough_for_pre_phase_cleanup(self, encounter):
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(
            created_at=timezone.now() - timedelta(days=2),
        )

    def test_empty_pre_phase_dry_run_leaves_encounter_active(self):
        encounter = _minimal_encounter()
        self.assertFalse(Consultation.objects.filter(encounter=encounter).exists())
        self._encounter_old_enough_for_pre_phase_cleanup(encounter)

        out = io.StringIO()
        call_command(
            "remove_orphan_consultations",
            "--kind=empty-pre-phase",
            "--older-than-days=1",
            stdout=out,
        )
        self.assertIn("Would remove/cancel", out.getvalue())
        self.assertIn("empty pre-phase encounter", out.getvalue())
        encounter.refresh_from_db()
        self.assertEqual(encounter.status, "created")
        self.assertTrue(encounter.is_active)

    def test_empty_pre_phase_apply_cancels_encounter_and_skips_completed_pre(self):
        encounter = _minimal_encounter()
        self._encounter_old_enough_for_pre_phase_cleanup(encounter)

        out = io.StringIO()
        call_command(
            "remove_orphan_consultations",
            "--kind=empty-pre-phase",
            "--older-than-days=1",
            "--apply",
            stdout=out,
        )
        self.assertIn("cancelled", out.getvalue().lower())
        encounter.refresh_from_db()
        self.assertEqual(encounter.status, "cancelled")
        self.assertFalse(encounter.is_active)

        # Completed pre-consultation must not be cleaned by this bucket
        encounter2 = _minimal_encounter()
        self._encounter_old_enough_for_pre_phase_cleanup(encounter2)
        pre = PreConsultationService.create_preconsultation(
            encounter=encounter2, specialty_code="physician"
        )
        PreConsultation.objects.filter(pk=pre.pk).update(
            is_completed=True,
            completed_at=timezone.now(),
        )

        self.assertEqual(len(collect_empty_pre_phase_encounter_pks(older_than_days=1)), 0)

        # Meaningful vitals exclude encounter from candidates
        encounter3 = _minimal_encounter()
        self._encounter_old_enough_for_pre_phase_cleanup(encounter3)
        pre3 = PreConsultationService.create_preconsultation(
            encounter=encounter3, specialty_code="physician"
        )
        PreConsultationVitals.objects.create(
            pre_consultation=pre3,
            data={"bp": {"systolic": 120, "diastolic": 80}},
        )
        self.assertNotIn(encounter3.pk, collect_empty_pre_phase_encounter_pks(older_than_days=1))

    def test_cancelled_empty_pre_apply_removes_leftover_pre(self):
        """API cancel leaves encounter terminal; empty PreConsultation may remain — this bucket scrubs it."""
        encounter = _minimal_encounter()
        PreConsultationService.create_preconsultation(
            encounter=encounter, specialty_code="physician"
        )
        EncounterStateMachine.cancel(encounter, user=None)
        encounter.refresh_from_db()
        self.assertEqual(encounter.status, "cancelled")
        self.assertFalse(encounter.is_active)
        self.assertTrue(PreConsultation.objects.filter(encounter=encounter).exists())

        ClinicalEncounter.objects.filter(pk=encounter.pk).update(
            cancelled_at=timezone.now() - timedelta(days=2),
        )

        out = io.StringIO()
        call_command(
            "remove_orphan_consultations",
            "--kind=cancelled-empty-pre",
            "--older-than-days=1",
            "--apply",
            stdout=out,
        )
        self.assertIn("scrubbed empty pre", out.getvalue().lower())
        self.assertFalse(PreConsultation.objects.filter(encounter=encounter).exists())
        encounter.refresh_from_db()
        self.assertEqual(encounter.status, "cancelled")

    def test_cancelled_empty_pre_days_zero_includes_same_day(self):
        encounter = _minimal_encounter()
        PreConsultationService.create_preconsultation(
            encounter=encounter, specialty_code="physician"
        )
        EncounterStateMachine.cancel(encounter, user=None)
        self.assertTrue(PreConsultation.objects.filter(encounter=encounter).exists())

        out = io.StringIO()
        call_command(
            "remove_orphan_consultations",
            "--kind=cancelled-empty-pre",
            "--older-than-days=0",
            "--apply",
            stdout=out,
        )
        self.assertFalse(PreConsultation.objects.filter(encounter=encounter).exists())
