"""Slim report summary serializers for list endpoints (patient / encounter)."""

from rest_framework import serializers

from diagnostics_engine.services.reports.report_detail_presenter import ReportSummaryDTO


class ReportSummaryListSerializer(serializers.Serializer):
    """Lightweight operational summary — no patient_name (patient list endpoint)."""

    report_id = serializers.UUIDField()
    test_label = serializers.CharField()
    status = serializers.CharField()
    delivery_status = serializers.CharField()
    updated_at = serializers.DateTimeField()

    @classmethod
    def from_dto(cls, dto: ReportSummaryDTO):
        return cls(
            {
                "report_id": dto.report_id,
                "test_label": dto.test_label,
                "status": dto.status,
                "delivery_status": dto.delivery_status,
                "updated_at": dto.updated_at,
            }
        )
