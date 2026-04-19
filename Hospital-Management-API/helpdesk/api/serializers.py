from rest_framework import serializers

from helpdesk.models import HelpdeskClinicUser


def _normalize_mobile_digits(value: str) -> str:
    return "".join(c for c in (value or "") if c.isdigit())


class HelpdeskCreateSerializer(serializers.Serializer):
    clinic_id = serializers.UUIDField()
    first_name = serializers.CharField(min_length=1, max_length=150, trim_whitespace=True)
    last_name = serializers.CharField(min_length=1, max_length=150, trim_whitespace=True)
    mobile = serializers.CharField(min_length=10, max_length=15)

    def validate_mobile(self, value):
        digits = _normalize_mobile_digits(value)
        if len(digits) < 10:
            raise serializers.ValidationError("Enter a valid mobile number.")
        return digits


class HelpdeskListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    mobile = serializers.CharField(source="user.username")

    class Meta:
        model = HelpdeskClinicUser
        fields = ["id", "name", "mobile", "is_active"]

    def get_name(self, obj):
        parts = [obj.user.first_name or "", obj.user.last_name or ""]
        return " ".join(p for p in parts if p).strip()
