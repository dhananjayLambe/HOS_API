"""Tests for Meta WhatsApp client template configuration."""

import os
from unittest.mock import patch

from django.test import TestCase, override_settings

from notifications.services.delivery.meta_client import (
    filter_recommendation_template_components,
    filter_template_components,
    recommendation_template_body_param_keys,
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

    @override_settings(
        WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_BODY_PARAM_KEYS=(
            "patient_name,test_names,mrp,quoted_price,savings"
        ),
        DEBUG=False,
    )
    def test_recommendation_template_body_param_keys(self):
        self.assertEqual(
            recommendation_template_body_param_keys(),
            ["patient_name", "test_names", "mrp", "quoted_price", "savings"],
        )

    def test_filter_recommendation_template_components(self):
        with patch(
            "notifications.services.delivery.meta_client.recommendation_template_body_param_keys",
            return_value=["patient_name", "mrp"],
        ):
            filtered = filter_recommendation_template_components(
                {
                    "patient_name": "Ada",
                    "test_names": "CBS",
                    "mrp": "1000",
                }
            )
        self.assertEqual(filtered, {"patient_name": "Ada", "mrp": "1000"})


class MetaRecommendationSendTests(TestCase):
    @override_settings(
        WHATSAPP_ACCESS_TOKEN="test-token",
        WHATSAPP_PHONE_NUMBER_ID="123456",
        WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID="",
        WHATSAPP_USE_SIMULATED_PROVIDER=False,
        DEBUG=False,
    )
    @patch.dict(
        os.environ,
        {
            "WHATSAPP_ACCESS_TOKEN": "test-token",
            "WHATSAPP_PHONE_NUMBER_ID": "123456",
            "WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID": "your_meta_flow_id",
        },
        clear=False,
    )
    @patch("notifications.services.delivery.meta_client.MetaWhatsAppClient._post_json")
    def test_recommendation_send_omits_flow_button_without_flow_id(self, mock_post):
        mock_post.return_value = {"messages": [{"id": "wamid.test"}]}
        from notifications.services.delivery.meta_client import MetaWhatsAppClient

        client = MetaWhatsAppClient()
        client.send_recommendation_template(
            to="919876543210",
            template_name="diagnostic_test_recommendation_v3",
            components={
                "patient_name": "Ada",
                "test_names": "HbA1c",
                "mrp": "800",
                "quoted_price": "600",
                "savings": "200",
            },
            rendered_body="body",
            flow_action_data={"consultation_id": "abc"},
        )
        payload = mock_post.call_args[0][1]
        components = payload["template"]["components"]
        self.assertEqual(len(components), 1)
        self.assertEqual(components[0]["type"], "body")

    @override_settings(WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID="your_meta_flow_id", DEBUG=False)
    @patch.dict(os.environ, {"WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID": "your_meta_flow_id"}, clear=False)
    def test_recommendation_uses_flow_button_rejects_placeholder(self):
        from notifications.services.delivery.meta_client import recommendation_uses_flow_button

        self.assertFalse(recommendation_uses_flow_button())

    @override_settings(
        WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID="4044933628970837",
        WHATSAPP_DIAGNOSTIC_RECOMMENDATION_USE_FLOW_BUTTON=False,
        DEBUG=False,
    )
    @patch.dict(
        os.environ,
        {
            "WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID": "4044933628970837",
            "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_USE_FLOW_BUTTON": "false",
        },
        clear=False,
    )
    @patch("notifications.services.delivery.meta_client.MetaWhatsAppClient._post_json")
    def test_recommendation_send_omits_flow_button_until_m5_opt_in(self, mock_post):
        mock_post.return_value = {"messages": [{"id": "wamid.test"}]}
        from notifications.services.delivery.meta_client import (
            MetaWhatsAppClient,
            recommendation_uses_flow_button,
        )

        self.assertFalse(recommendation_uses_flow_button())
        client = MetaWhatsAppClient()
        client.send_recommendation_template(
            to="919876543210",
            template_name="diagnostic_test_recommendation_v3",
            components={"patient_name": "Ada", "test_names": "HbA1c", "mrp": "920", "quoted_price": "800", "savings": "120"},
            rendered_body="body",
            flow_action_data={"consultation_id": "abc"},
        )
        components = mock_post.call_args[0][1]["template"]["components"]
        self.assertEqual(len(components), 1)
        self.assertEqual(components[0]["type"], "body")
