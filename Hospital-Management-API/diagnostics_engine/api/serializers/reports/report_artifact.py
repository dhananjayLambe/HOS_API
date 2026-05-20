"""Artifact read serializers — no storage internals."""

from rest_framework import serializers

from diagnostics_engine.models.reports import DiagnosticReportArtifact


class ReportArtifactSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = DiagnosticReportArtifact
        fields = [
            "id",
            "artifact_type",
            "original_filename",
            "download_filename",
            "file_size",
            "content_type",
            "is_primary",
            "version",
            "uploaded_at",
            "download_url",
        ]
        read_only_fields = fields

    def get_download_url(self, obj: DiagnosticReportArtifact) -> None:
        return None
