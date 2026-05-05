import factory
from django.contrib.auth.models import Group

from doctor.models import doctor as DoctorModel

from .base import BaseModelFactory
from .user import UserFactory


class DoctorFactory(BaseModelFactory):
    class Meta:
        model = DoctorModel

    user = factory.SubFactory(UserFactory)
    primary_specialization = "general"
    is_approved = True

    @classmethod
    def _exclude_from_clean(cls):
        return ["photo", "digital_signature"]

    @factory.post_generation
    def clinics(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for c in extracted:
                self.clinics.add(c)


def ensure_doctor_group(user):
    g, _ = Group.objects.get_or_create(name="doctor")
    user.groups.add(g)
