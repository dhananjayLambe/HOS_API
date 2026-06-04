"""Operational report history response serializers (active lineage only — not audit)."""

from rest_framework import serializers

from diagnostics_engine.api.serializers.reports.delivery import DeliveryLogSerializer
from diagnostics_engine.api.serializers.reports.report_artifact import ReportArtifactSerializer
from diagnostics_engine.services.reports.report_history_presenter import OperationalReportHistoryDTO


class OperationalReportHistorySerializer(serializers.Serializer):
    report_id = serializers.UUIDField()
    supersedes_id = serializers.UUIDField(allow_null=True)
    superseded_by_id = serializers.UUIDField(allow_null=True)
    last_reupload_reason = serializers.CharField(allow_null=True, required=False)
    artifacts = ReportArtifactSerializer(many=True)
    delivery_logs = DeliveryLogSerializer(many=True)

    @classmethod
    def from_dto(cls, dto: OperationalReportHistoryDTO):
        return cls(
            {
                "report_id": dto.report_id,
                "supersedes_id": dto.supersedes_id,
                "superseded_by_id": dto.superseded_by_id,
                "last_reupload_reason": dto.last_reupload_reason,
                "artifacts": ReportArtifactSerializer(dto.artifacts, many=True).data,
                "delivery_logs": DeliveryLogSerializer(dto.delivery_logs, many=True).data,
            }
        )
