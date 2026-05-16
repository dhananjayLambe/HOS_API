"""Serializers for GET /api/labs/orders/ list response."""

from rest_framework import serializers


class LabOrderListItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    order_number = serializers.CharField()
    assignment_id = serializers.UUIDField()
    patient_name = serializers.CharField()
    patient_phone = serializers.CharField(allow_blank=True)
    patient_age = serializers.IntegerField(allow_null=True, required=False)
    patient_gender = serializers.CharField(allow_blank=True, required=False)
    patient_address = serializers.CharField(allow_blank=True, required=False)
    doctor_name = serializers.CharField(allow_blank=True)
    clinic_name = serializers.CharField(allow_blank=True, required=False)
    test_names = serializers.ListField(child=serializers.CharField())
    collection_type = serializers.ChoiceField(choices=["HOME", "VISIT"])
    preferred_slot_label = serializers.CharField(allow_blank=True)
    urgency = serializers.ChoiceField(choices=["STAT", "URGENT", "ROUTINE"])
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
    assigned_at = serializers.DateTimeField()
    accepted_at = serializers.DateTimeField(allow_null=True, required=False)
    rejected_at = serializers.DateTimeField(allow_null=True, required=False)
    rejection_reason = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    sample_status = serializers.CharField(allow_null=True, required=False)
    report_status = serializers.CharField(allow_null=True, required=False)
    home_collection = serializers.BooleanField()


def dto_to_representation(dto) -> dict:
    return {
        "id": dto.id,
        "order_number": dto.order_number,
        "assignment_id": dto.assignment_id,
        "patient_name": dto.patient_name,
        "patient_phone": dto.patient_phone,
        "patient_age": dto.patient_age,
        "patient_gender": dto.patient_gender,
        "patient_address": dto.patient_address,
        "doctor_name": dto.doctor_name,
        "clinic_name": dto.clinic_name,
        "test_names": dto.test_names,
        "collection_type": dto.collection_type,
        "preferred_slot_label": dto.preferred_slot_label,
        "urgency": dto.urgency,
        "status": dto.status,
        "created_at": dto.created_at,
        "assigned_at": dto.assigned_at,
        "accepted_at": dto.accepted_at,
        "rejected_at": dto.rejected_at,
        "rejection_reason": dto.rejection_reason,
        "sample_status": dto.sample_status,
        "report_status": dto.report_status,
        "home_collection": dto.home_collection,
    }
