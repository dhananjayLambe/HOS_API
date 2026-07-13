"""Context tests."""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import RequestFactory, TestCase

from support_trace.api.context import SupportInvestigationContext

User = get_user_model()


class ContextTests(TestCase):
    def test_from_request_helpdesk_role(self) -> None:
        user = User.objects.create_user(username="ctx-help", password="x")
        group, _ = Group.objects.get_or_create(name="helpdesk")
        user.groups.add(group)
        request = RequestFactory().get("/api/v1/support/search")
        request.user = user
        ctx = SupportInvestigationContext.from_request(request)
        self.assertEqual(ctx.role, "helpdesk")
        self.assertTrue(ctx.investigation_id)
        self.assertTrue(ctx.masking_policy.mask_patient_pii)
