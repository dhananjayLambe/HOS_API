"""Artifact read serializers — no storage internals."""

from django.urls import reverse
from rest_framework import serializers

from diagnostics_engine.models.reports import DiagnosticReportArtifact


class ReportArtifactSerializer(serializers.ModelSerializer):
    artifact_id = serializers.UUIDField(source="artifact_public_id", read_only=True)
    storage_state = serializers.CharField(source="artifact_state", read_only=True)
    uploaded_by = serializers.UUIDField(source="uploaded_by_user_uuid", allow_null=True, read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = DiagnosticReportArtifact
        fields = [
            "id",
            "artifact_id",
            "artifact_type",
            "original_filename",
            "download_filename",
            "file_size",
            "content_type",
            "is_primary",
            "version",
            "storage_state",
            "patient_account_uuid",
            "patient_profile_uuid",
            "source_type",
            "artifact_category",
            "retention_until",
            "legal_hold",
            "uploaded_at",
            "uploaded_by",
            "download_url",
        ]
        read_only_fields = fields

    def get_download_url(self, obj: DiagnosticReportArtifact) -> str | None:
        request = self.context.get("request")
        if request is None:
            return None
        path = reverse(
            "diagnostic-report-artifact-download",
            kwargs={"report_id": obj.report_id, "artifact_id": obj.id},
        )
        return request.build_absolute_uri(path)
