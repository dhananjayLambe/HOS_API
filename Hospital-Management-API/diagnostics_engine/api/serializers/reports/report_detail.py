"""Report detail and summary serializers."""

from rest_framework import serializers

from diagnostics_engine.api.serializers.reports.delivery import DeliveryLogSerializer
from diagnostics_engine.api.serializers.reports.report_artifact import ReportArtifactSerializer
from diagnostics_engine.services.reports.report_detail_presenter import (
    ReportDetailDTO,
    ReportSummaryDTO,
)


class ReportSummarySerializer(serializers.Serializer):
    report_id = serializers.UUIDField()
    patient_name = serializers.CharField()
    test_label = serializers.CharField()
    status = serializers.CharField()
    delivery_status = serializers.CharField()
    primary_artifact_filename = serializers.CharField(allow_null=True)
    updated_at = serializers.DateTimeField()

    @classmethod
    def from_dto(cls, dto: ReportSummaryDTO):
        return cls(dto.__dict__)


class ReportInfoSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.CharField()
    delivery_status = serializers.CharField()
    revision_number = serializers.IntegerField()
    ready_at = serializers.DateTimeField(allow_null=True)
    delivered_at = serializers.DateTimeField(allow_null=True)
    last_reupload_reason = serializers.CharField(allow_null=True, required=False)


class ReportDetailSerializer(serializers.Serializer):
    report = ReportInfoSerializer()
    patient = serializers.DictField()
    artifacts = ReportArtifactSerializer(many=True)
    delivery = DeliveryLogSerializer(allow_null=True)
    history = serializers.DictField()
    available_actions = serializers.ListField(child=serializers.CharField())

    @classmethod
    def from_dto(cls, dto: ReportDetailDTO, *, context: dict | None = None):
        report = dto.report
        return cls(
            {
                "report": {
                    "id": report.id,
                    "status": report.status,
                    "delivery_status": report.delivery_status,
                    "revision_number": report.revision_number,
                    "ready_at": report.ready_at,
                    "delivered_at": report.delivered_at,
                    "last_reupload_reason": report.last_reupload_reason,
                },
                "patient": dto.patient_summary,
                "artifacts": dto.artifacts,
                "delivery": dto.latest_delivery,
                "history": dto.lineage,
                "available_actions": dto.available_actions,
            },
            context=context,
        )
