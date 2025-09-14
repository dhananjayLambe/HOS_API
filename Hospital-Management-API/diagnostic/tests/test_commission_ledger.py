# diagnostic/tests/test_commission_ledger.py

from django.test import TestCase
from diagnostic.models import (
    DiagnosticLab, MedicalTest, TestBooking, TestRecommendation,
    TestLabMapping, Consultation, LabCommissionLedger
)
from patient_account.models import  PatientProfile, PatientAccount
from account.models import User
from decimal import Decimal

class LabCommissionLedgerTests(TestCase):
    def setUp(self):
        # Create User
        self.user = User.objects.create_user(username="doctor1", password="pass")

        # Create Lab
        self.lab = DiagnosticLab.objects.create(
            name="Test Lab", commission_percent=15.0, doctor_commission_percent=5.0
        )

        # Create Test
        self.test = MedicalTest.objects.create(
            name="cbc", type="blood", standard_price=100.00
        )

        # Create Patient & Consultation
        self.patient = PatientProfile.objects.create(user=self.user)
        self.consultation = Consultation.objects.create(
            patient=self.patient, doctor=self.user
        )

        # Create Recommendation
        self.recommendation = TestRecommendation.objects.create(
            consultation=self.consultation, test=self.test, recommended_by=self.user
        )

        # Create Lab Mapping with specific commission values
        self.mapping = TestLabMapping.objects.create(
            test=self.test, lab=self.lab, price=200.00,
            platform_commission_percent=10.0, doctor_commission_percent=2.0
        )

    def test_commission_ledger_created_on_booking_complete(self):
        # Create booking
        booking = TestBooking.objects.create(
            consultation=self.consultation,
            patient_profile=self.patient,
            recommendation=self.recommendation,
            lab=self.lab,
            lab_mapping=self.mapping,
            test_price=Decimal("200.00"),
            status="PENDING"
        )

        # Simulate status change to COMPLETED (this will trigger the signal)
        booking.status = "COMPLETED"
        booking.save()

        # Fetch ledger
        ledger = LabCommissionLedger.objects.filter(booking=booking).first()
        self.assertIsNotNone(ledger, "Ledger entry not created.")

        # Validate values
        self.assertEqual(ledger.platform_commission_amount, Decimal("20.00"))
        self.assertEqual(ledger.doctor_commission_amount, Decimal("4.00"))
        self.assertEqual(ledger.lab_net_earning, Decimal("176.00"))

    def test_ledger_not_created_twice(self):
        booking = TestBooking.objects.create(
            consultation=self.consultation,
            patient_profile=self.patient,
            recommendation=self.recommendation,
            lab=self.lab,
            lab_mapping=self.mapping,
            test_price=Decimal("150.00"),
            status="COMPLETED"
        )
        # Save again
        booking.status = "COMPLETED"
        booking.save()

        count = LabCommissionLedger.objects.filter(booking=booking).count()
        self.assertEqual(count, 1, "Ledger entry created more than once")

    def test_fallback_to_lab_percent(self):
        # Remove mapping percentages
        self.mapping.platform_commission_percent = None
        self.mapping.doctor_commission_percent = None
        self.mapping.save()

        booking = TestBooking.objects.create(
            consultation=self.consultation,
            patient_profile=self.patient,
            recommendation=self.recommendation,
            lab=self.lab,
            lab_mapping=self.mapping,
            test_price=Decimal("100.00"),
            status="COMPLETED"
        )

        ledger = LabCommissionLedger.objects.get(booking=booking)
        self.assertEqual(ledger.platform_commission_amount, Decimal("15.00"))
        self.assertEqual(ledger.doctor_commission_amount, Decimal("5.00"))
        self.assertEqual(ledger.lab_net_earning, Decimal("80.00"))