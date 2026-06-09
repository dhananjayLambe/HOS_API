"""Tests for Meta WhatsApp webhook."""

import uuid

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from django.utils import timezone

from notifications.models.whatsapp_notifications import (
    WhatsAppConversationCategory,
    WhatsAppMessage,
    WhatsAppMessageStatus,
    WhatsAppMessageType,
    WhatsAppProvider,
)


class WhatsAppWebhookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.message = WhatsAppMessage(
            provider=WhatsAppProvider.META,
            conversation_category=WhatsAppConversationCategory.UTILITY,
            message_type=WhatsAppMessageType.OTP,
            status=WhatsAppMessageStatus.SENT,
            recipient_mobile_number="9876543210",
            meta_message_id="wamid.test123",
            sent_at=timezone.now(),
            idempotency_key=f"otp_{uuid.uuid4()}",
        )
        self.message.save()

    @override_settings(WHATSAPP_WEBHOOK_VERIFY_TOKEN="doctorpro_webhook_secret")
    def test_verify_challenge(self):
        url = reverse("whatsapp-webhook")
        response = self.client.get(
            url,
            {"hub.mode": "subscribe", "hub.verify_token": "doctorpro_webhook_secret", "hub.challenge": "12345"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode(), "12345")

    def test_status_update_delivered(self):
        url = reverse("whatsapp-webhook")
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "statuses": [
                                    {
                                        "id": "wamid.test123",
                                        "status": "delivered",
                                        "timestamp": "1717750800",
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.message.refresh_from_db()
        self.assertEqual(self.message.status, WhatsAppMessageStatus.DELIVERED)
