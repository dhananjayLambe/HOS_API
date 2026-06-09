"""Tests for WhatsApp phone normalization."""

from django.test import TestCase, override_settings

from notifications.services.delivery.phone_utils import normalize_delivery_phone, try_normalize_delivery_phone


class PhoneUtilsTests(TestCase):
    @override_settings(WHATSAPP_DEFAULT_COUNTRY_CODE="91")
    def test_ten_digit_indian_number_gets_country_code(self):
        self.assertEqual(normalize_delivery_phone("9730789922"), "919730789922")

    @override_settings(WHATSAPP_DEFAULT_COUNTRY_CODE="91")
    def test_number_with_plus_and_country_code_unchanged(self):
        self.assertEqual(normalize_delivery_phone("+919730789922"), "919730789922")

    @override_settings(WHATSAPP_DEFAULT_COUNTRY_CODE="91")
    def test_leading_zero_stripped(self):
        self.assertEqual(normalize_delivery_phone("09730789922"), "919730789922")

    def test_invalid_short_number_returns_none(self):
        self.assertIsNone(try_normalize_delivery_phone("12345"))
