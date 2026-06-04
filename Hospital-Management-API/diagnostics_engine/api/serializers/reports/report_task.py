"""Operational queue / task context serializers (DTO-driven)."""

from rest_framework import serializers

from diagnostics_engine.services.reports.report_task_presenter import (
    ReportActionTargetsDTO,
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
    upload_target = serializers.DictField(allow_null=True)

    @classmethod
    def from_dto(cls, dto: ReportTaskContextDTO):
        upload_target = None
        if dto.upload_target is not None:
            upload_target = {
                "report_id": dto.upload_target.report_id,
                "line_id": dto.upload_target.line_id,
                "operational_status": dto.upload_target.operational_status,
            }
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
                "upload_target": upload_target,
            }
        )


class ReportActionTargetsSerializer(serializers.Serializer):
    upload_report_id = serializers.UUIDField(allow_null=True)
    mark_ready_report_id = serializers.UUIDField(allow_null=True)
    correct_report_id = serializers.UUIDField(allow_null=True)
    send_whatsapp_report_id = serializers.UUIDField(allow_null=True)
    retry_delivery_log_id = serializers.UUIDField(allow_null=True)

    @classmethod
    def from_dto(cls, dto: ReportActionTargetsDTO):
        return cls(
            {
                "upload_report_id": dto.upload_report_id,
                "mark_ready_report_id": dto.mark_ready_report_id,
                "correct_report_id": dto.correct_report_id,
                "send_whatsapp_report_id": dto.send_whatsapp_report_id,
                "retry_delivery_log_id": dto.retry_delivery_log_id,
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
    total_reports = serializers.IntegerField()
    required_reports = serializers.IntegerField()
    uploaded_reports = serializers.IntegerField()
    uploaded_required_reports = serializers.IntegerField()
    delivered_reports = serializers.IntegerField()
    pending_reports = serializers.IntegerField()
    failed_reports = serializers.IntegerField()
    order_workflow_state = serializers.CharField()
    order_workflow_reason = serializers.DictField()
    last_report_uploaded_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    assigned_at = serializers.DateTimeField(allow_null=True)
    sample_collected_at = serializers.DateTimeField(allow_null=True)
    operational_anchor_at = serializers.DateTimeField(allow_null=True)
    available_action_targets = ReportActionTargetsSerializer()

    @classmethod
    def from_dto(cls, dto: ReportTaskDTO):
        payload = {**dto.__dict__}
        payload["order_workflow_reason"] = {
            "code": dto.order_workflow_reason_code,
            "message": dto.order_workflow_reason_message,
        }
        payload["available_action_targets"] = ReportActionTargetsSerializer.from_dto(
            dto.available_action_targets
        ).data
        return cls(payload)
