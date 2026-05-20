"""Operational queue / task context serializers (DTO-driven)."""

from rest_framework import serializers

from diagnostics_engine.services.reports.report_task_presenter import (
    ReportLineReportDTO,
    ReportTaskContextDTO,
    ReportTaskDTO,
)


class ReportLineReportSerializer(serializers.Serializer):
    report_id = serializers.UUIDField()
    line_id = serializers.UUIDField()
    test_label = serializers.CharField()
    status = serializers.CharField()
    delivery_status = serializers.CharField()
    available_actions = serializers.ListField(child=serializers.CharField())

    @classmethod
    def from_dto(cls, dto: ReportLineReportDTO):
        return cls(
            {
                "report_id": dto.report_id,
                "line_id": dto.line_id,
                "test_label": dto.test_label,
                "status": dto.status,
                "delivery_status": dto.delivery_status,
                "available_actions": dto.available_actions,
            }
        )


class ReportTaskContextSerializer(serializers.Serializer):
    task_id = serializers.UUIDField()
    assignment_id = serializers.UUIDField()
    order_uuid = serializers.UUIDField()
    order_number = serializers.CharField()
    patient = serializers.DictField()
    collection_type = serializers.CharField()
    visit_or_slot_label = serializers.CharField()
    operational_status = serializers.CharField()
    active_reports = ReportLineReportSerializer(many=True)

    @classmethod
    def from_dto(cls, dto: ReportTaskContextDTO):
        return cls(
            {
                "task_id": dto.task_id,
                "assignment_id": dto.assignment_id,
                "order_uuid": dto.order_uuid,
                "order_number": dto.order_number,
                "patient": {
                    "name": dto.patient_name,
                    "phone": dto.patient_phone,
                    "encounter_id": str(dto.encounter_id) if dto.encounter_id else None,
                },
                "collection_type": dto.collection_type,
                "visit_or_slot_label": dto.visit_or_slot_label,
                "operational_status": dto.operational_status,
                "active_reports": [
                    ReportLineReportSerializer.from_dto(row).data
                    for row in dto.active_reports
                ],
            }
        )


class ReportTaskSerializer(serializers.Serializer):
    task_id = serializers.CharField()
    assignment_id = serializers.CharField()
    order_uuid = serializers.CharField()
    order_number = serializers.CharField()
    patient_name = serializers.CharField()
    patient_phone = serializers.CharField()
    collection_type = serializers.CharField()
    test_label = serializers.CharField()
    operational_status = serializers.CharField()
    visit_or_slot_label = serializers.CharField()
    pending_sibling_count = serializers.IntegerField()
    uploaded_at = serializers.DateTimeField(allow_null=True)
    ready_at = serializers.DateTimeField(allow_null=True)
    delivered_at = serializers.DateTimeField(allow_null=True)

    @classmethod
    def from_dto(cls, dto: ReportTaskDTO):
        return cls(dto.__dict__)
