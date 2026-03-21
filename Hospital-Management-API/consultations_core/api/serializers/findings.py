# consultations_core/api/serializers/findings.py
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from consultations_core.models.findings import ConsultationFinding, CustomFinding, FindingMaster

logger = logging.getLogger(__name__)


class ConsultationFindingSerializer(serializers.ModelSerializer):
    """Read shape for list/detail + create response."""

    finding_id = serializers.UUIDField(source="finding.id", read_only=True, allow_null=True)
    finding_code = serializers.CharField(source="finding.code", read_only=True, allow_null=True)
    custom_finding_id = serializers.UUIDField(
        source="custom_finding.id", read_only=True, allow_null=True
    )
    consultation_id = serializers.UUIDField(source="consultation.id", read_only=True)

    class Meta:
        model = ConsultationFinding
        fields = [
            "id",
            "consultation_id",
            "finding_id",
            "finding_code",
            "custom_finding_id",
            "display_name",
            "is_custom",
            "severity",
            "note",
            "extension_data",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "consultation_id",
            "finding_id",
            "finding_code",
            "custom_finding_id",
            "display_name",
            "is_custom",
            "is_active",
            "created_at",
            "updated_at",
        ]


class CreateConsultationFindingSerializer(serializers.Serializer):
    """Exactly one of: master (finding_id | finding_code) or custom (custom_name)."""

    finding_id = serializers.UUIDField(required=False, allow_null=True)
    finding_code = serializers.CharField(required=False, allow_blank=True, max_length=100)
    custom_name = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate(self, attrs):
        fid = attrs.get("finding_id")
        fcode = (attrs.get("finding_code") or "").strip()
        cname = (attrs.get("custom_name") or "").strip()

        has_master = fid is not None or bool(fcode)
        has_custom = bool(cname)

        if has_master == has_custom:
            err = "Provide exactly one of: (finding_id or finding_code) OR custom_name."
            logger.warning("CreateConsultationFindingSerializer: %s attrs=%s", err, attrs)
            raise serializers.ValidationError(err)

        if has_master and fid is not None and fcode:
            raise serializers.ValidationError("Use either finding_id or finding_code, not both.")

        return attrs


class PatchConsultationFindingSerializer(serializers.Serializer):
    severity = serializers.ChoiceField(
        choices=["mild", "moderate", "severe"],
        required=False,
        allow_null=True,
    )
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    extension_data = serializers.JSONField(required=False, allow_null=True)

    def validate_extension_data(self, value):
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("extension_data must be an object.")
        return value


def apply_patch_to_instance(instance: ConsultationFinding, data: dict, *, user):
    if "severity" in data:
        instance.severity = data["severity"]
    if "note" in data:
        instance.note = data["note"] or None
    if "extension_data" in data:
        instance.extension_data = data["extension_data"]
    instance.updated_by = user
    try:
        instance.save()
    except DjangoValidationError as e:
        logger.warning(
            "ConsultationFinding save failed id=%s: %s",
            instance.pk,
            getattr(e, "messages", str(e)),
        )
        raise serializers.ValidationError(
            getattr(e, "message_dict", None)
            or {"detail": "; ".join(getattr(e, "messages", [str(e)]))}
        ) from e
