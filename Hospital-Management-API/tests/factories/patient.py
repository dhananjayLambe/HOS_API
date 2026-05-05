import factory
from django.contrib.auth.models import Group

from patient_account.models import PatientAccount, PatientProfile

from .base import BaseModelFactory
from .user import UserFactory


def ensure_patient_group(user):
    g, _ = Group.objects.get_or_create(name="patient")
    user.groups.add(g)


class PatientAccountFactory(BaseModelFactory):
    class Meta:
        model = PatientAccount

    user = factory.SubFactory(UserFactory)

    @factory.post_generation
    def clinics(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        for c in extracted:
            self.clinics.add(c)


class PatientProfileFactory(BaseModelFactory):
    class Meta:
        model = PatientProfile

    account = factory.SubFactory(PatientAccountFactory)
    first_name = "Pat"
    last_name = "Client"
    relation = "self"
    gender = "male"
    age_years = 30
