"""Tests for remove_orphan_consultations management command."""

from __future__ import annotations

import io
import uuid

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from clinic.models import Clinic
from consultations_core.management.commands.remove_orphan_consultations import queryset_stranded
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.services.consultation_start_service import start_consultation_for_encounter
from consultations_core.services.encounter_service import EncounterService
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
        relation="self",
        gender="male",
    )
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=account,
        patient_profile=profile,
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
