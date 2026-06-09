"""Tests for Meta WhatsApp client template configuration."""

from django.test import TestCase, override_settings

from notifications.services.delivery.meta_client import (
    sanitize_template_parameter,
    template_body_param_keys,
    template_language_code,
)


class MetaClientTemplateConfigTests(TestCase):
    @override_settings(
        WHATSAPP_TEMPLATE_BODY_PARAM_KEYS="patient_name,doctor_name,medicine_block,test_block,prescription_url"
    )
    def test_default_body_param_keys(self):
        self.assertEqual(
            template_body_param_keys(),
            [
                "patient_name",
                "doctor_name",
                "medicine_block",
                "test_block",
                "prescription_url",
            ],
        )

    @override_settings(WHATSAPP_TEMPLATE_BODY_PARAM_KEYS="")
    def test_empty_body_param_keys_for_static_templates(self):
        self.assertEqual(template_body_param_keys(), [])

    @override_settings(WHATSAPP_TEMPLATE_LANGUAGE_CODE="en_US")
    def test_template_language_code(self):
        self.assertEqual(template_language_code(), "en_US")

    def test_sanitize_template_parameter_strips_newlines(self):
        raw = "Line one\nLine two\r\nLine three"
        self.assertEqual(sanitize_template_parameter(raw), "Line one Line two Line three")

    def test_sanitize_template_parameter_empty_uses_fallback(self):
        self.assertEqual(sanitize_template_parameter(""), "-")
        self.assertEqual(sanitize_template_parameter("   "), "-")
