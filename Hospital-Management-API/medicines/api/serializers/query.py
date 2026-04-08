from rest_framework import serializers


class MedicineSuggestionsQuerySerializer(serializers.Serializer):
    doctor_id = serializers.UUIDField(required=True)
    patient_id = serializers.UUIDField(required=False, allow_null=True)
    consultation_id = serializers.UUIDField(required=False, allow_null=True)
    diagnosis_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )
    symptom_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )
    limit = serializers.IntegerField(required=False, default=10, min_value=1, max_value=15)
    include_scores = serializers.BooleanField(required=False, default=False)

    def validate_limit(self, value: int) -> int:
        return min(int(value), 15)


class MedicineHybridQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True, default="")
    doctor_id = serializers.UUIDField(required=True)
    patient_id = serializers.UUIDField(required=False, allow_null=True)
    consultation_id = serializers.UUIDField(required=False, allow_null=True)
    diagnosis_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )
    symptom_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )
    # Allow large client values; cap in validate_limit (max_value=15 rejects e.g. 99 with 400).
    limit = serializers.IntegerField(required=False, default=10, min_value=1, max_value=10_000)

    def validate_limit(self, value: int) -> int:
        return min(int(value), 15)


__all__ = ["MedicineHybridQuerySerializer", "MedicineSuggestionsQuerySerializer"]
