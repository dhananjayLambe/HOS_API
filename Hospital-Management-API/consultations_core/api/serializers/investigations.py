from rest_framework import serializers

from consultations_core.models.investigation import InvestigationSource, InvestigationType


class InvestigationItemResponseSerializer(serializers.Serializer):
    """Read-only UI-ready shape for InvestigationItem."""

    id = serializers.UUIDField()
    name = serializers.CharField()
    source = serializers.CharField()
    is_custom = serializers.BooleanField()
    urgency = serializers.CharField()
    instructions = serializers.CharField(allow_null=True, required=False)
    notes = serializers.CharField(allow_null=True, required=False)
    position = serializers.IntegerField()
    status = serializers.CharField(required=False)
    investigation_type = serializers.CharField(required=False)
    catalog_item_id = serializers.UUIDField(allow_null=True, required=False)
    custom_investigation_id = serializers.UUIDField(allow_null=True, required=False)
    diagnostic_package_id = serializers.UUIDField(allow_null=True, required=False)
    package_expansion_snapshot = serializers.JSONField(required=False, allow_null=True)


def investigation_item_to_dict(item) -> dict:
    return {
        "id": str(item.id),
        "name": item.name,
        "source": item.source,
        "is_custom": item.is_custom,
        "urgency": item.urgency,
        "instructions": item.instructions or "",
        "notes": item.notes or "",
        "position": item.position,
        "status": item.status,
        "investigation_type": item.investigation_type,
        "catalog_item_id": str(item.catalog_item_id) if item.catalog_item_id else None,
        "custom_investigation_id": str(item.custom_investigation_id) if item.custom_investigation_id else None,
        "diagnostic_package_id": str(item.diagnostic_package_id) if item.diagnostic_package_id else None,
        "package_expansion_snapshot": item.package_expansion_snapshot,
    }


class AddInvestigationItemSerializer(serializers.Serializer):
    source = serializers.ChoiceField(choices=[c[0] for c in InvestigationSource.choices])
    catalog_item_id = serializers.UUIDField(required=False, allow_null=True)
    custom_investigation_id = serializers.UUIDField(required=False, allow_null=True)
    diagnostic_package_id = serializers.UUIDField(required=False, allow_null=True)
    name = serializers.CharField(required=False, allow_blank=True)
    investigation_type = serializers.ChoiceField(
        choices=[c[0] for c in InvestigationType.choices],
        required=False,
        default=InvestigationType.OTHER,
    )
    position = serializers.IntegerField(required=False, min_value=1, allow_null=True)
    instructions = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    urgency = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data.get("instructions") is None:
            data["instructions"] = ""
        if data.get("notes") is None:
            data["notes"] = ""
        src = data["source"]
        cid = data.get("catalog_item_id")
        cust = data.get("custom_investigation_id")
        pkg = data.get("diagnostic_package_id")
        name = (data.get("name") or "").strip()

        if src == InvestigationSource.CATALOG:
            if not cid:
                raise serializers.ValidationError({"catalog_item_id": "Required for catalog source."})
            if cust or pkg:
                raise serializers.ValidationError("Only catalog_item_id allowed for catalog source.")
        elif src == InvestigationSource.CUSTOM:
            if not cust and not name:
                raise serializers.ValidationError(
                    "Provide custom_investigation_id or non-empty name for custom source."
                )
            if cid or pkg:
                raise serializers.ValidationError("Only custom fields allowed for custom source.")
        elif src == InvestigationSource.PACKAGE:
            if not pkg:
                raise serializers.ValidationError({"diagnostic_package_id": "Required for package source."})
            if cid or cust:
                raise serializers.ValidationError("Only diagnostic_package_id allowed for package source.")
        return data


class PatchInvestigationItemSerializer(serializers.Serializer):
    instructions = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    urgency = serializers.CharField(required=False, allow_blank=True)
    position = serializers.IntegerField(required=False, min_value=1)


class CustomInvestigationCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    investigation_type = serializers.ChoiceField(choices=[c[0] for c in InvestigationType.choices])
    consultation_id = serializers.UUIDField(required=False, allow_null=True)
