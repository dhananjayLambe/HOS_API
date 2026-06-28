"""API tests for Marketplace Recommendation Platform API (M3)."""

from __future__ import annotations

import json
import uuid
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from clinic.models import Clinic, ClinicAddress
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.investigation import ConsultationInvestigations
from consultations_core.services.encounter_service import EncounterService
from diagnostics_engine.domain.recommendation import LabRecommendationService, RecommendationFailureReason
from diagnostics_engine.models import DiagnosticCategory, DiagnosticPackage, DiagnosticPackageItem, DiagnosticServiceMaster
from diagnostics_engine.models.marketplace_recommendation_audit import MarketplaceRecommendationApiAudit
from diagnostics_engine.models.orders import DiagnosticOrder
from diagnostics_engine.models.routing import RoutingRun
from diagnostics_engine.tests.test_lab_recommendation_service import (
    _clinic_with_pincode,
    _lab_org_branch_area,
)
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _doctor_user_and_profile,
    _pricing,
)
from labs.models import BranchServicePricing
from labs.models.lab_auth import LabBranch
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()
URL = reverse("v1-marketplace-diagnostics-recommendations")


class MarketplaceRecommendationSerializerTests(TestCase):
    def test_next_action_mapping(self):
        from diagnostics_engine.api.serializers.marketplace_recommendation import NEXT_ACTION

        self.assertEqual(NEXT_ACTION[RecommendationFailureReason.NO_ELIGIBLE_LABORATORY], "CHANGE_LOCATION")
        self.assertEqual(NEXT_ACTION[RecommendationFailureReason.ONLY_CUSTOM_INVESTIGATIONS], "REMOVE_CUSTOM_TEST")

    def test_branch_channel_field_helpers(self):
        from diagnostics_engine.api.serializers.marketplace_recommendation import (
            _branch_working_hours,
            _google_maps_url,
        )
        from datetime import time
        from unittest.mock import Mock

        branch = Mock(opening_time=time(9, 30), closing_time=time(18, 0))
        hours = _branch_working_hours(branch)
        self.assertEqual(hours["opening"], "09:30")
        self.assertIn("18:00", hours["display"])
        url = _google_maps_url(Decimal("19.0760"), Decimal("72.8777"))
        self.assertIn("google.com/maps", url)

    def test_label_split_and_why_recommended(self):
        from diagnostics_engine.api.serializers.marketplace_recommendation import (
            _split_labels,
            _why_recommended,
        )

        primary, secondary = _split_labels(["fastest", "recommended", "nearest"])
        self.assertEqual(primary, "recommended")
        self.assertEqual(set(secondary), {"fastest", "nearest"})
        why = _why_recommended(["recommended", "fastest"])
        self.assertIn("Best overall score", why)
        self.assertIn("Fastest turnaround", why)


class MarketplaceRecommendationAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(name="M3 Cat", code=f"M3-{uuid.uuid4().hex[:6]}")
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"m3_svc_{uuid.uuid4().hex[:6]}",
            name="M3 Test",
            category=cls.cat,
            home_collection_possible=True,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_m3_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="M3 Pkg",
            category=cls.cat,
        )
        DiagnosticPackageItem.objects.create(
            package=cls.pkg,
            service=cls.svc,
            quantity=1,
            is_mandatory=True,
            display_order=1,
        )
        cls.org, cls.branch = _lab_org_branch_area()
        from datetime import time

        LabBranch.objects.filter(pk=cls.branch.pk).update(
            opening_time=time(8, 0),
            closing_time=time(20, 0),
        )
        cls.branch.refresh_from_db()
        _pricing(cls.branch, cls.svc, cls.pkg)

    def setUp(self):
        self.clinic = _clinic_with_pincode("400001")
        g, _ = Group.objects.get_or_create(name="doctor")
        self.user, self.doc = _doctor_user_and_profile(self.clinic)
        self.user.groups.add(g)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.consultation, self.encounter, _, _, _, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=True,
            svc=self.svc,
        )
        ClinicalEncounter.objects.filter(pk=self.encounter.pk).update(clinic=self.clinic)
        self.encounter.refresh_from_db()

    def test_api_success_envelope(self):
        r = self.client.post(
            URL,
            {"consultation_id": str(self.consultation.id), "client_request_id": "wa-retry-1"},
            format="json",
            HTTP_X_REQUEST_ID="corr-123",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("metadata", r.data)
        self.assertIn("recommendation", r.data)
        self.assertIn("tests", r.data)
        self.assertIsNone(r.data["error"])
        self.assertTrue(r.data["recommendation"]["available"])
        self.assertEqual(r.data["metadata"]["client_request_id"], "wa-retry-1")
        self.assertEqual(r.data["metadata"]["recommendation_version"], "v1")
        self.assertEqual(r.data["metadata"]["expires_in_seconds"], 900)
        self.assertIsNotNone(r.data["metadata"]["recommendation_id"])
        self.assertIsNotNone(r.data["recommendation"]["quoted_price"])
        self.assertIsNotNone(r.data["recommendation"]["branch"]["city"])
        self.assertTrue(r.data["recommendation"]["home_collection_available"])
        self.assertIn(r.data["recommendation"]["collection_mode"], ("home", "lab"))
        self.assertIsNotNone(r.data["recommendation"]["branch_address"])
        self.assertIsNotNone(r.data["recommendation"]["branch_contact_number"])
        self.assertIsNotNone(r.data["recommendation"]["google_maps_url"])
        self.assertIn("google.com/maps", r.data["recommendation"]["google_maps_url"])
        hours = r.data["recommendation"]["branch_working_hours"]
        self.assertEqual(hours["opening"], "08:00")
        self.assertEqual(hours["closing"], "20:00")
        self.assertIsNone(r.data["recommendation"]["available_slot_dates"])
        self.assertGreater(len(r.data["recommendation"]["why_recommended"]), 0)

    def test_audit_row_created(self):
        before = MarketplaceRecommendationApiAudit.objects.count()
        self.client.post(URL, {"consultation_id": str(self.consultation.id)}, format="json")
        self.assertEqual(MarketplaceRecommendationApiAudit.objects.count(), before + 1)
        audit = MarketplaceRecommendationApiAudit.objects.latest("created_at")
        self.assertEqual(audit.consultation_id, self.consultation.id)
        self.assertEqual(audit.user_id, self.user.pk)

    def test_no_order_or_routing_writes(self):
        orders_before = DiagnosticOrder.objects.count()
        runs_before = RoutingRun.objects.count()
        self.client.post(URL, {"consultation_id": str(self.consultation.id)}, format="json")
        self.assertEqual(DiagnosticOrder.objects.count(), orders_before)
        self.assertEqual(RoutingRun.objects.count(), runs_before)

    def test_unauthorized(self):
        c = APIClient()
        r = c.post(URL, {"consultation_id": str(self.consultation.id)}, format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_forbidden_wrong_doctor(self):
        other_clinic = Clinic.objects.create(name=f"Other {uuid.uuid4().hex[:4]}")
        other_user, other_doc = _doctor_user_and_profile(other_clinic)
        g, _ = Group.objects.get_or_create(name="doctor")
        other_user.groups.add(g)
        consultation, enc, _, _, _, _ = _consultation_with_investigations(
            other_user,
            other_doc,
            with_catalog=True,
            svc=self.svc,
        )
        ClinicalEncounter.objects.filter(pk=enc.pk).update(clinic=other_clinic)
        r = self.client.post(URL, {"consultation_id": str(consultation.id)}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(r.data["error"]["code"], "PERMISSION_DENIED")

    def test_consultation_not_found(self):
        r = self.client.post(
            URL,
            {"consultation_id": str(uuid.uuid4())},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(r.data["error"]["code"], "CONSULTATION_NOT_FOUND")

    def test_no_investigations_400(self):
        pu = User.objects.create_user(username=f"empty_{uuid.uuid4().hex[:8]}", password="x")
        pa = PatientAccount.objects.create(user=pu)
        pa.clinics.add(self.clinic)
        profile = PatientProfile.objects.create(
            account=pa,
            first_name="E",
            last_name="M",
            relation="self",
            gender="male",
            date_of_birth=date(1990, 1, 1),
        )
        encounter = EncounterService.create_encounter(
            clinic=self.clinic,
            patient_account=pa,
            patient_profile=profile,
            doctor=self.doc,
            created_by=self.user,
        )
        consultation = Consultation.objects.create(encounter=encounter)
        ConsultationInvestigations.objects.get_or_create(consultation=consultation)

        r = self.client.post(URL, {"consultation_id": str(consultation.id)}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(r.data["error"]["code"], ("NO_INVESTIGATIONS", "VALIDATION_ERROR"))
        self.assertEqual(r.data["error"]["next_action"], "ADD_INVESTIGATIONS")

    def test_no_eligible_lab_409(self):
        BranchServicePricing.objects.filter(branch=self.branch, service=self.svc).update(is_active=False)
        r = self.client.post(URL, {"consultation_id": str(self.consultation.id)}, format="json")
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(r.data["error"]["code"], "NO_ELIGIBLE_LABORATORY")
        self.assertEqual(r.data["error"]["next_action"], "CHANGE_LOCATION")

    def test_parity_with_domain_service(self):
        api_r = self.client.post(URL, {"consultation_id": str(self.consultation.id)}, format="json")
        self.assertEqual(api_r.status_code, status.HTTP_200_OK)
        domain = LabRecommendationService.recommend(consultation=self.consultation)
        self.assertEqual(
            api_r.data["recommendation"]["branch"]["id"],
            str(domain.recommended_branch.pk),
        )
        self.assertEqual(
            api_r.data["recommendation"]["routing_estimated_price"],
            str(domain.routing_estimated_price),
        )

    @override_settings(MARKETPLACE_RECOMMENDATION_TTL_SECONDS=600)
    def test_ttl_setting(self):
        r = self.client.post(URL, {"consultation_id": str(self.consultation.id)}, format="json")
        self.assertEqual(r.data["metadata"]["expires_in_seconds"], 600)

    def test_chaos_branch_inactive(self):
        LabBranch.objects.filter(pk=self.branch.pk).update(is_active=False)
        r = self.client.post(URL, {"consultation_id": str(self.consultation.id)}, format="json")
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)

    def test_chaos_location_removed(self):
        ClinicAddress.objects.filter(clinic=self.clinic).delete()
        r = self.client.post(URL, {"consultation_id": str(self.consultation.id)}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["code"], "LOCATION_MISSING")

    def test_payload_size_budget(self):
        r = self.client.post(URL, {"consultation_id": str(self.consultation.id)}, format="json")
        size = len(json.dumps(r.data))
        self.assertLess(size, 25 * 1024)

    def test_superuser_can_access_other_doctor_consultation(self):
        other_clinic = Clinic.objects.create(name=f"SU {uuid.uuid4().hex[:4]}")
        ClinicAddress.objects.create(
            clinic=other_clinic,
            address="1 Rd",
            address2="",
            city="Mumbai",
            state="MH",
            pincode="400001",
            latitude=Decimal("19.0760"),
            longitude=Decimal("72.8777"),
        )
        other_user, other_doc = _doctor_user_and_profile(other_clinic)
        consultation, enc, _, _, _, _ = _consultation_with_investigations(
            other_user,
            other_doc,
            with_catalog=True,
            svc=self.svc,
        )
        ClinicalEncounter.objects.filter(pk=enc.pk).update(clinic=other_clinic)
        su = User.objects.create_superuser(
            username=f"su_{uuid.uuid4().hex[:8]}",
            password="x",
            email="su@test.com",
        )
        c = APIClient()
        c.force_authenticate(user=su)
        r = c.post(URL, {"consultation_id": str(consultation.id)}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
