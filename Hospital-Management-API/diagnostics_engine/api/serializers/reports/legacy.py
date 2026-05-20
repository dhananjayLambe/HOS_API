"""Legacy serializers for deprecated api/diagnostics routes."""

from rest_framework import serializers

from diagnostics_engine.api.serializers.reports.report_artifact import ReportArtifactSerializer
from diagnostics_engine.models.reports import DiagnosticTestReport


class DiagnosticReportArtifactSerializer(ReportArtifactSerializer):
    """Alias for legacy imports."""


class DiagnosticTestReportSerializer(serializers.ModelSerializer):
    artifacts = ReportArtifactSerializer(many=True, read_only=True)

    class Meta:
        model = DiagnosticTestReport
        fields = [
            "id",
            "order_test_line",
            "status",
            "delivery_status",
            "storage_mode",
            "report_number",
            "revision_number",
            "ready_at",
            "uploaded_at",
            "delivered_at",
            "is_editable",
            "supersedes",
            "artifacts",
        ]
        read_only_fields = fields


class UploadReportArtifactSerializer(serializers.Serializer):
    file = serializers.FileField()
    artifact_type = serializers.CharField(max_length=20, required=False)
    is_primary = serializers.BooleanField(default=False, required=False)
    version = serializers.IntegerField(min_value=1, default=1, required=False)


class DeliverReportSerializer(serializers.Serializer):
    channel = serializers.CharField(max_length=30)
    recipient = serializers.CharField(max_length=20)
