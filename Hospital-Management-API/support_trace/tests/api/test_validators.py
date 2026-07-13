"""Validator tests."""

from django.test import SimpleTestCase

from shared.audit.base_validator import is_valid_uuid
from support_trace.api.validators import allows_partial_search, resolve_exact_only


class ValidatorTests(SimpleTestCase):
    def test_uuid_forces_exact_only(self) -> None:
        uid = "550e8400-e29b-41d4-a716-446655440000"
        self.assertTrue(is_valid_uuid(uid))
        self.assertTrue(resolve_exact_only(uid, None))

    def test_phone_allows_partial(self) -> None:
        self.assertTrue(allows_partial_search("9876543210"))
