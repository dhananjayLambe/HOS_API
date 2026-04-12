import uuid

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinic.models import Clinic
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.investigation import InvestigationItem
from consultations_core.services.encounter_service import EncounterService
from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticServiceMaster,
)
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _make_doctor_client():
    g, _ = Group.objects.get_or_create(name="doctor")
    u = User.objects.create_user(
        username=f"doc_inv_{uuid.uuid4().hex[:10]}",
        password="testpass123",
        first_name="Doc",
        last_name="Test",
    )
    u.groups.add(g)
    client = APIClient()
    client.force_authenticate(user=u)
    return client, u


def _make_consultation_for_doctor(doctor_user):
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    pu = User.objects.create_user(
        username=f"pat_inv_{uuid.uuid4().hex[:10]}",
        password="testpass123",
        first_name="Pat",
        last_name="Test",
    )
    pa = PatientAccount.objects.create(user=pu)
    pa.clinics.add(clinic)
    profile = PatientProfile.objects.create(account=pa, first_name="Pat", relation="self", gender="male")

    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=pa,
        patient_profile=profile,
        created_by=doctor_user,
    )
    consultation = Consultation.objects.create(encounter=encounter)
    encounter.refresh_from_db()
    return consultation, encounter, clinic


class ConsultationInvestigationAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(
            name="Lab",
            code=f"LAB-{uuid.uuid4().hex[:8]}",
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"tst_{uuid.uuid4().hex[:6]}",
            name="API Test Service",
            category=cls.cat,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"pkg_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            category=cls.cat,
            name="API Test Package",
        )
        DiagnosticPackageItem.objects.create(package=cls.pkg, service=cls.svc)

    def setUp(self):
        self.client, self.doctor_user = _make_doctor_client()
        self.consultation, self.encounter, self.clinic = _make_consultation_for_doctor(self.doctor_user)
        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(status="consultation_in_progress")
        self.encounter.refresh_from_db()

    def _items_url(self):
        return reverse(
            "consultation-investigation-items",
            kwargs={"consultation_id": self.consultation.id},
        )

    def _item_url(self, item_id):
        return reverse(
            "consultation-investigation-item-detail",
            kwargs={"consultation_id": self.consultation.id, "item_id": item_id},
        )

    def test_list_empty(self):
        r = self.client.get(self._items_url())
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["items"], [])

    def test_add_catalog_and_duplicate_idempotent(self):
        body = {"source": "catalog", "catalog_item_id": str(self.svc.id)}
        r1 = self.client.post(self._items_url(), body, format="json")
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r1.data["item"]["name"], self.svc.name)
        self.assertFalse(r1.data["meta"]["duplicate"])

        r2 = self.client.post(self._items_url(), body, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertTrue(r2.data["meta"]["duplicate"])
        self.assertEqual(r1.data["item"]["id"], r2.data["item"]["id"])

    def test_patch_item(self):
        r = self.client.post(
            self._items_url(),
            {"source": "catalog", "catalog_item_id": str(self.svc.id)},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        item_id = r.data["item"]["id"]

        p = self.client.patch(
            self._item_url(item_id),
            {"instructions": "Fasting", "notes": "AM", "urgency": "urgent"},
            format="json",
        )
        self.assertEqual(p.status_code, status.HTTP_200_OK)
        self.assertEqual(p.data["instructions"], "Fasting")
        self.assertEqual(p.data["urgency"], "urgent")

    def test_delete_soft_then_compact(self):
        r = self.client.post(
            self._items_url(),
            {"source": "catalog", "catalog_item_id": str(self.svc.id)},
            format="json",
        )
        item_id = r.data["item"]["id"]
        d = self.client.delete(self._item_url(item_id))
        self.assertEqual(d.status_code, status.HTTP_204_NO_CONTENT)
        row = InvestigationItem.objects.get(pk=item_id)
        self.assertTrue(row.is_deleted)

    def test_package_includes_snapshot(self):
        r = self.client.post(
            self._items_url(),
            {"source": "package", "diagnostic_package_id": str(self.pkg.id)},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        snap = r.data["item"].get("package_expansion_snapshot") or []
        self.assertTrue(len(snap) >= 1)
        self.assertEqual(snap[0].get("service_code"), self.svc.code)

    def test_custom_master_and_item(self):
        url_custom = reverse("investigations-custom-create")
        cr = self.client.post(
            url_custom,
            {
                "name": "Serum Ferritin",
                "investigation_type": "lab",
                "consultation_id": str(self.consultation.id),
            },
            format="json",
        )
        self.assertEqual(cr.status_code, status.HTTP_201_CREATED)
        cid = cr.data["id"]

        r = self.client.post(
            self._items_url(),
            {"source": "custom", "custom_investigation_id": cid},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data["item"]["is_custom"])

    def test_finalized_while_in_progress_forbidden(self):
        """Inconsistent state: still in_progress but consultation flagged finalized."""
        Consultation.objects.filter(pk=self.consultation.pk).update(
            is_finalized=True,
            ended_at=timezone.now(),
        )
        r = self.client.post(
            self._items_url(),
            {"source": "catalog", "catalog_item_id": str(self.svc.id)},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_post_consultation_allows_catalog_and_custom(self):
        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(
            status="consultation_completed",
            is_active=False,
        )
        Consultation.objects.filter(pk=self.consultation.pk).update(
            is_finalized=True,
            ended_at=timezone.now(),
        )
        self.encounter.refresh_from_db()
        self.consultation.refresh_from_db()

        r = self.client.post(
            self._items_url(),
            {"source": "catalog", "catalog_item_id": str(self.svc.id)},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

        url_custom = reverse("investigations-custom-create")
        cr = self.client.post(
            url_custom,
            {
                "name": "Post-End Custom",
                "investigation_type": "lab",
                "consultation_id": str(self.consultation.id),
            },
            format="json",
        )
        self.assertEqual(cr.status_code, status.HTTP_201_CREATED)
        r2 = self.client.post(
            self._items_url(),
            {"source": "custom", "custom_investigation_id": cr.data["id"]},
            format="json",
        )
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)

    def test_closed_encounter_forbidden(self):
        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(status="closed", is_active=False)
        self.encounter.refresh_from_db()
        r = self.client.post(
            self._items_url(),
            {"source": "catalog", "catalog_item_id": str(self.svc.id)},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
