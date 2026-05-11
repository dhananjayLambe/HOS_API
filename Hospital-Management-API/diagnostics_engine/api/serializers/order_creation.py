from rest_framework import serializers

from consultations_core.models.consultation import Consultation
from diagnostics_engine.domain.order_creation import DiagnosticOrderCreationResult
from labs.models import LabBranch


class CreateDiagnosticOrderFromConsultationSerializer(serializers.Serializer):
    consultation_id = serializers.UUIDField()
    branch_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_consultation_id(self, value):
        if not Consultation.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Consultation not found.")
        return value

    def validate_branch_id(self, value):
        if value is None:
            return value
        if not LabBranch.objects.filter(pk=value, is_active=True, is_deleted=False).exists():
            raise serializers.ValidationError("Lab branch not found or inactive.")
        return value


class DiagnosticOrderCreationResponseSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    order_number = serializers.CharField()
    status = serializers.CharField()
    items_created = serializers.IntegerField()
    test_lines_created = serializers.IntegerField()
    idempotent = serializers.BooleanField()

    @classmethod
    def from_result(cls, result: DiagnosticOrderCreationResult) -> dict:
        o = result.order
        return {
            "order_id": str(o.id),
            "order_number": o.order_number,
            "status": o.status,
            "items_created": result.items_created,
            "test_lines_created": result.test_lines_created,
            "idempotent": result.idempotent,
        }
