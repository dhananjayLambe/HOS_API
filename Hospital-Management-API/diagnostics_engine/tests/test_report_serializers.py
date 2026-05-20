"""Serializer shape validation tests (no business rules)."""

from __future__ import annotations

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase

from diagnostics_engine.api.pagination import ReportSummaryCursorPagination
from diagnostics_engine.api.serializers.reports.delivery_actions import SendWhatsAppRequestSerializer
from diagnostics_engine.api.serializers.reports.upload_request import UploadArtifactRequestSerializer
from diagnostics_engine.domain.reports import upload_rules


class ReportSerializerTests(TestCase):
    def test_upload_rejects_empty_files(self):
        ser = UploadArtifactRequestSerializer(data={"files": []})
        self.assertFalse(ser.is_valid())

    def test_upload_rejects_primary_index_out_of_range(self):
        f = SimpleUploadedFile("a.pdf", b"x", content_type="application/pdf")
        ser = UploadArtifactRequestSerializer(data={"files": [f], "primary_file_index": 1})
        self.assertFalse(ser.is_valid())

    def test_upload_rejects_too_many_files(self):
        files = [
            SimpleUploadedFile(f"f{i}.pdf", b"x", content_type="application/pdf")
            for i in range(upload_rules.DEFAULT_MAX_REPORT_UPLOAD_FILES + 1)
        ]
        ser = UploadArtifactRequestSerializer(data={"files": files})
        self.assertFalse(ser.is_valid())

    def test_send_whatsapp_rejects_invalid_phone_shape(self):
        ser = SendWhatsAppRequestSerializer(
            data={"recipient_phone": "not-a-phone", "channel": "WHATSAPP"},
        )
        self.assertFalse(ser.is_valid())

    def test_send_whatsapp_rejects_invalid_channel(self):
        ser = SendWhatsAppRequestSerializer(
            data={"recipient_phone": "9876543210", "channel": "SMS"},
        )
        self.assertFalse(ser.is_valid())

    def test_pagination_clamps_invalid_page_size(self):
        factory = RequestFactory()
        request = factory.get("/", {"page_size": "9999"})
        paginator = ReportSummaryCursorPagination()
        self.assertEqual(paginator.get_page_size(request), paginator.max_page_size)

    def test_pagination_invalid_string_falls_back(self):
        factory = RequestFactory()
        request = factory.get("/", {"page_size": "abc"})
        paginator = ReportSummaryCursorPagination()
        self.assertEqual(paginator.get_page_size(request), paginator.page_size)
