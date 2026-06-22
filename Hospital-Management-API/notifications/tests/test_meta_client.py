"""Tests for Meta WhatsApp client template configuration."""

import os
from unittest.mock import patch

from django.test import TestCase, override_settings

from notifications.services.delivery.meta_client import (
    filter_template_components,
    sanitize_template_parameter,
    template_body_param_keys,
    template_language_code,
)


class MetaClientTemplateConfigTests(TestCase):
    @override_settings(
        WHATSAPP_TEMPLATE_BODY_PARAM_KEYS="patient_name,doctor_name,medicine_block,test_block",
        DEBUG=False,
    )
    @patch.dict(os.environ, {}, clear=False)
    def test_consultant_utlity_body_param_keys(self):
        with patch.dict(os.environ, {"WHATSAPP_TEMPLATE_BODY_PARAM_KEYS": ""}, clear=False):
            self.assertEqual(
                template_body_param_keys(),
                [
                    "patient_name",
                    "doctor_name",
                    "medicine_block",
                    "test_block",
                ],
            )

    @override_settings(WHATSAPP_TEMPLATE_BODY_PARAM_KEYS="", DEBUG=False)
    @patch.dict(os.environ, {"WHATSAPP_TEMPLATE_BODY_PARAM_KEYS": ""}, clear=False)
    def test_empty_body_param_keys_for_static_templates(self):
        self.assertEqual(template_body_param_keys(), [])

    @override_settings(WHATSAPP_TEMPLATE_LANGUAGE_CODE="en", DEBUG=False)
    @patch.dict(os.environ, {"WHATSAPP_TEMPLATE_LANGUAGE_CODE": ""}, clear=False)
    def test_template_language_code(self):
        self.assertEqual(template_language_code(), "en")

    def test_filter_template_components(self):
        with patch(
            "notifications.services.delivery.meta_client.template_body_param_keys",
            return_value=["patient_name", "medicine_block"],
        ):
            filtered = filter_template_components(
                {
                    "patient_name": "Ada",
                    "doctor_name": "Dr X",
                    "medicine_block": "Paracetamol",
                    "test_block": "CBC",
                    "prescription_url": "https://example.com",
                }
            )
        self.assertEqual(filtered, {"patient_name": "Ada", "medicine_block": "Paracetamol"})

    def test_sanitize_template_parameter_strips_newlines(self):
        raw = "Line one\nLine two\r\nLine three"
        self.assertEqual(sanitize_template_parameter(raw), "Line one Line two Line three")

    def test_sanitize_template_parameter_empty_uses_fallback(self):
        self.assertEqual(sanitize_template_parameter(""), "-")
        self.assertEqual(sanitize_template_parameter("   "), "-")
