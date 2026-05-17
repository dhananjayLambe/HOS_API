"""Serializers for home collections dashboard API."""

from rest_framework import serializers

from labs.api.services.home_collections_presenter import HomeCollectionListRowDTO


class HomeCollectionListItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    order_number = serializers.CharField()
    order_uuid = serializers.UUIDField()
    assignment_id = serializers.UUIDField(allow_null=True)
    patient_name = serializers.CharField()
    patient_phone = serializers.CharField()
    patient_age = serializers.IntegerField(allow_null=True)
    patient_gender = serializers.CharField()
    test_count = serializers.IntegerField()
    test_names = serializers.ListField(child=serializers.CharField())
    test_names_overflow = serializers.IntegerField()
    preferred_date = serializers.DateField()
    preferred_slot = serializers.CharField()
    confirmed_date = serializers.DateField(allow_null=True)
    confirmed_slot = serializers.CharField(allow_null=True)
    slot_date_label = serializers.CharField()
    slot_time_label = serializers.CharField()
    assigned_phlebotomist_id = serializers.UUIDField(allow_null=True)
    assigned_phlebotomist_name = serializers.CharField(allow_null=True)
    assignment_note = serializers.CharField(allow_blank=True)
    collection_status = serializers.CharField()
    workflow_hint = serializers.CharField()
    allowed_actions = serializers.ListField(child=serializers.CharField())
    address_snapshot = serializers.DictField()
    address_formatted = serializers.CharField()
    patient_notes = serializers.CharField(allow_null=True)
    internal_notes = serializers.CharField(allow_null=True)
    assigned_at = serializers.DateTimeField(allow_null=True)
    in_progress_at = serializers.DateTimeField(allow_null=True)
    collected_at = serializers.DateTimeField(allow_null=True)
    failed_at = serializers.DateTimeField(allow_null=True)
    retry_count = serializers.IntegerField()
    collection_type = serializers.CharField()


def dto_to_representation(dto: HomeCollectionListRowDTO) -> dict:
    return {
        "id": dto.id,
        "order_number": dto.order_number,
        "order_uuid": dto.order_uuid,
        "assignment_id": dto.assignment_id,
        "patient_name": dto.patient_name,
        "patient_phone": dto.patient_phone,
        "patient_age": dto.patient_age,
        "patient_gender": dto.patient_gender,
        "test_count": dto.test_count,
        "test_names": dto.test_names,
        "test_names_overflow": dto.test_names_overflow,
        "preferred_date": dto.preferred_date,
        "preferred_slot": dto.preferred_slot,
        "confirmed_date": dto.confirmed_date,
        "confirmed_slot": dto.confirmed_slot,
        "slot_date_label": dto.slot_date_label,
        "slot_time_label": dto.slot_time_label,
        "assigned_phlebotomist_id": dto.assigned_phlebotomist_id,
        "assigned_phlebotomist_name": dto.assigned_phlebotomist_name,
        "assignment_note": dto.assignment_note,
        "collection_status": dto.collection_status,
        "workflow_hint": dto.workflow_hint,
        "allowed_actions": dto.allowed_actions,
        "address_snapshot": dto.address_snapshot,
        "address_formatted": dto.address_formatted,
        "patient_notes": dto.patient_notes,
        "internal_notes": dto.internal_notes,
        "assigned_at": dto.assigned_at,
        "in_progress_at": dto.in_progress_at,
        "collected_at": dto.collected_at,
        "failed_at": dto.failed_at,
        "retry_count": dto.retry_count,
        "collection_type": dto.collection_type,
    }


class HomeCollectionAssignSerializer(serializers.Serializer):
    phlebotomist_id = serializers.UUIDField(required=False, allow_null=True)
    assignment_note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
    )


class HomeCollectionFailSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class HomeCollectionWorkflowResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    collection_status = serializers.CharField()
    message = serializers.CharField()
    collection_id = serializers.UUIDField()
    allowed_actions = serializers.ListField(child=serializers.CharField())
    assignment_note = serializers.CharField(allow_blank=True)


class PhlebotomistListItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    role = serializers.CharField()


class HomeCollectionsSummarySerializer(serializers.Serializer):
    pending_collections = serializers.IntegerField()
    assigned_today = serializers.IntegerField()
    active_collections = serializers.IntegerField()
    collected_today = serializers.IntegerField()
    failed_no_response = serializers.IntegerField()
