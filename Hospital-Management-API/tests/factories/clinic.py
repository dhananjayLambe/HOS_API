import uuid

import factory

from clinic.models import Clinic

from .base import BaseModelFactory


class ClinicFactory(BaseModelFactory):
    class Meta:
        model = Clinic

    name = factory.Sequence(lambda n: f"Test Clinic {n}")
    registration_number = factory.LazyAttribute(lambda o: f"REG-{uuid.uuid4().hex[:12]}")
    contact_number_primary = factory.Sequence(lambda n: f"91{n % 9000000000 + 1000000000:010d}")
    contact_number_secondary = factory.Sequence(lambda n: f"92{n % 9000000000 + 1000000000:010d}")
    website_url = "https://example.com/"
    email_address = "clinic@example.com"
    emergency_contact_name = "Emergency"
    emergency_contact_number = "919888888888"
    emergency_email_address = "emergency@example.com"
