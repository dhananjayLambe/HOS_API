import factory
from django.contrib.auth.models import Group

from helpdesk.models import HelpdeskClinicUser

from .base import BaseModelFactory
from .user import UserFactory


class HelpdeskClinicUserFactory(BaseModelFactory):
    class Meta:
        model = HelpdeskClinicUser

    user = factory.SubFactory(UserFactory)
    clinic = factory.SubFactory("tests.factories.clinic.ClinicFactory")
    is_active = True


def ensure_helpdesk_group(user):
    g, _ = Group.objects.get_or_create(name="helpdesk")
    user.groups.add(g)
