"""Tests for report API idempotency."""

from __future__ import annotations

import uuid

from django.urls import reverse
from rest_framework import status

from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.services.reports import ArtifactUploadService, ReportWorkflowService
from diagnostics_engine.tests.test_reports_api import ReportAPITestCase, _pdf


class ReportIdempotencyApiTests(ReportAPITestCase):
    def _mark_in_progress_with_artifact(self):
        ArtifactUploadService.upload_report_artifacts(
            report=self.report,
            uploaded_files=[_pdf(b"idem-test")],
            uploaded_by=self.lab_user.user,
            primary_file_index=0,
        )
        self.report.refresh_from_db()
        if self.report.status == ReportLifecycleStatus.PENDING:
            ReportWorkflowService.mark_in_progress(self.report, user=self.lab_user.user)

    def test_mark_ready_idempotent_replay(self):
        self._mark_in_progress_with_artifact()
        url = reverse("v1-report-mark-ready", kwargs={"report_id": self.report.id})
        key = str(uuid.uuid4())
        headers = {"HTTP_IDEMPOTENCY_KEY": key}

        first = self.client.post(url, {}, format="json", **headers)
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self.client.post(url, {}, format="json", **headers)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["data"]["status"], second.data["data"]["status"])

    def test_mark_ready_idempotency_hash_mismatch_409(self):
        self._mark_in_progress_with_artifact()
        url = reverse("v1-report-mark-ready", kwargs={"report_id": self.report.id})
        key = str(uuid.uuid4())
        headers = {"HTTP_IDEMPOTENCY_KEY": key}

        self.client.post(url, {"notes": "a"}, format="json", **headers)
        res = self.client.post(url, {"notes": "b"}, format="json", **headers)
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
