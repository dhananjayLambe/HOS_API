"""Tests for WhatsApp status presentation helpers."""

from types import SimpleNamespace

from django.test import TestCase

from notifications.models.whatsapp_notifications import WhatsAppMessageStatus
from notifications.services.presentation.whatsapp_status import (
    can_resend_whatsapp_message,
    can_retry_whatsapp_message,
    serialize_whatsapp_message,
)


class WhatsAppStatusPresentationTests(TestCase):
    def _message(self, *, message_status, failure_reason=""):
        return SimpleNamespace(
            id="00000000-0000-0000-0000-000000000001",
            status=message_status,
            sent_at=None,
            delivered_at=None,
            read_at=None,
            failure_reason=failure_reason,
        )

    def test_can_resend_for_skipped_no_phone(self):
        message = self._message(
            message_status=WhatsAppMessageStatus.SKIPPED,
            failure_reason="No mobile number",
        )
        self.assertTrue(can_resend_whatsapp_message(message))

    def test_cannot_resend_for_failed(self):
        message = self._message(message_status=WhatsAppMessageStatus.FAILED, failure_reason="Meta error")
        payload = serialize_whatsapp_message(message)
        self.assertFalse(payload["can_resend"])
        self.assertTrue(payload["can_retry"])

    def test_pseudo_sent_without_meta_id_treated_as_failed(self):
        message = SimpleNamespace(
            id="00000000-0000-0000-0000-000000000002",
            status=WhatsAppMessageStatus.SENT,
            sent_at=None,
            delivered_at=None,
            read_at=None,
            failure_reason="",
            meta_message_id="",
            error_code="132018",
            response_payload={"error": {"message": "(#132018) template params invalid"}},
            recipient_mobile_number="919730789922",
        )
        self.assertTrue(can_retry_whatsapp_message(message))
        payload = serialize_whatsapp_message(message)
        self.assertEqual(payload["status"], "failed")
        self.assertTrue(payload["can_retry"])
