from datetime import time, timedelta

import factory
from django.utils import timezone

from appointments.models import Appointment

from .base import BaseModelFactory


class AppointmentFactory(BaseModelFactory):
    class Meta:
        model = Appointment

    patient_account = factory.SubFactory("tests.factories.patient.PatientAccountFactory")
    patient_profile = factory.SubFactory(
        "tests.factories.patient.PatientProfileFactory",
        account=factory.SelfAttribute("..patient_account"),
    )
    doctor = factory.SubFactory("tests.factories.doctor.DoctorFactory")
    clinic = factory.SubFactory("tests.factories.clinic.ClinicFactory")
    # FK has null=True but not blank=True; full_clean() requires a user.
    created_by = factory.SubFactory("tests.factories.user.UserFactory")
    appointment_date = factory.LazyFunction(lambda: timezone.localdate() + timedelta(days=1))
    slot_start_time = factory.LazyFunction(lambda: time(10, 0))
    slot_end_time = factory.LazyFunction(lambda: time(10, 30))
    status = "scheduled"

    @factory.post_generation
    def _link_clinic(self, create, extracted, **kwargs):
        if not create:
            return
        self.patient_account.clinics.add(self.clinic)
        self.doctor.clinics.add(self.clinic)
