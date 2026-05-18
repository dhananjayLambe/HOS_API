"""Serializers for visit appointment workflow actions and list API."""

from __future__ import annotations

from rest_framework import serializers

from labs.api.services.visit_appointments_presenter import (
    VisitAppointmentListRowDTO,
    VisitTimelineEventDTO,
)


def timeline_event_to_representation(dto: VisitTimelineEventDTO) -> dict:
    return {
        "event": dto.event,
        "raw_event": dto.raw_event,
        "timestamp": dto.timestamp,
        "label": dto.label,
        "detail": dto.detail,
        "event_order": dto.event_order,
    }


class VisitTimelineEventSerializer(serializers.Serializer):
    event = serializers.CharField()
    raw_event = serializers.CharField()
    timestamp = serializers.CharField()
    label = serializers.CharField()
    detail = serializers.CharField(allow_blank=True)
    event_order = serializers.IntegerField()


class VisitAppointmentListItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    appointment_id = serializers.CharField()
    order_number = serializers.CharField()
    order_uuid = serializers.UUIDField()
    patient_name = serializers.CharField(allow_blank=True)
    patient_phone = serializers.CharField(allow_blank=True)
    patient_age = serializers.IntegerField(allow_null=True)
    patient_gender = serializers.CharField(allow_blank=True)
    test_count = serializers.IntegerField()
    test_names = serializers.ListField(child=serializers.CharField())
    test_names_overflow = serializers.IntegerField()
    appointment_date = serializers.DateField()
    appointment_slot = serializers.CharField(allow_blank=True)
    slot_date_label = serializers.CharField()
    slot_time_label = serializers.CharField()
    fasting_required = serializers.BooleanField()
    prep_tags = serializers.ListField(child=serializers.CharField())
    prep_summary = serializers.CharField(allow_blank=True)
    instructions = serializers.CharField(allow_blank=True)
    appointment_status = serializers.CharField()
    workflow_hint = serializers.CharField(allow_blank=True)
    allowed_actions = serializers.ListField(child=serializers.CharField())
    patient_notes = serializers.CharField(allow_null=True, allow_blank=True)
    status_updated_at = serializers.DateTimeField()
    confirmed_at = serializers.DateTimeField(allow_null=True)
    checked_in_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    no_show_at = serializers.DateTimeField(allow_null=True)
    cancelled_at = serializers.DateTimeField(allow_null=True)
    timeline_events = VisitTimelineEventSerializer(many=True)


def visit_list_dto_to_representation(dto: VisitAppointmentListRowDTO) -> dict:
    return {
        "id": dto.id,
        "appointment_id": dto.appointment_id,
        "order_number": dto.order_number,
        "order_uuid": dto.order_uuid,
        "patient_name": dto.patient_name,
        "patient_phone": dto.patient_phone,
        "patient_age": dto.patient_age,
        "patient_gender": dto.patient_gender,
        "test_count": dto.test_count,
        "test_names": dto.test_names,
        "test_names_overflow": dto.test_names_overflow,
        "appointment_date": dto.appointment_date,
        "appointment_slot": dto.appointment_slot,
        "slot_date_label": dto.slot_date_label,
        "slot_time_label": dto.slot_time_label,
        "fasting_required": dto.fasting_required,
        "prep_tags": dto.prep_tags,
        "prep_summary": dto.prep_summary,
        "instructions": dto.instructions,
        "appointment_status": dto.appointment_status,
        "workflow_hint": dto.workflow_hint,
        "allowed_actions": dto.allowed_actions,
        "patient_notes": dto.patient_notes,
        "status_updated_at": dto.status_updated_at,
        "confirmed_at": dto.confirmed_at,
        "checked_in_at": dto.checked_in_at,
        "completed_at": dto.completed_at,
        "no_show_at": dto.no_show_at,
        "cancelled_at": dto.cancelled_at,
        "timeline_events": [
            timeline_event_to_representation(event) for event in dto.timeline_events
        ],
    }


class VisitAppointmentsSummarySerializer(serializers.Serializer):
    scheduled_today = serializers.IntegerField()
    confirmed_today = serializers.IntegerField()
    checked_in = serializers.IntegerField()
    completed_today = serializers.IntegerField()
    failed_no_show = serializers.IntegerField()


class VisitConfirmSerializer(serializers.Serializer):
    pass


class VisitCheckInSerializer(serializers.Serializer):
    pass


class VisitCompleteSerializer(serializers.Serializer):
    pass


class VisitMarkNoShowSerializer(serializers.Serializer):
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=1000,
    )


VisitNoShowSerializer = VisitMarkNoShowSerializer


class VisitRescheduleSerializer(serializers.Serializer):
    appointment_date = serializers.DateField(required=False)
    appointment_slot = serializers.CharField(required=False, allow_blank=True, max_length=30)


class VisitWorkflowResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    appointment_status = serializers.CharField()
    workflow_hint = serializers.CharField()
    allowed_actions = serializers.ListField(child=serializers.CharField())
    message = serializers.CharField()
    appointment_id = serializers.CharField()
    confirmed_at = serializers.DateTimeField(allow_null=True)
    checked_in_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    no_show_at = serializers.DateTimeField(allow_null=True)
    cancelled_at = serializers.DateTimeField(allow_null=True, required=False)
    status_updated_at = serializers.DateTimeField(allow_null=True, required=False)


def visit_workflow_response_to_representation(payload: dict) -> dict:
    data = dict(payload)
    if "status_updated_at" not in data or data.get("status_updated_at") is None:
        data["status_updated_at"] = data.get("status_changed_at")
    data.pop("status_changed_at", None)
    return data
