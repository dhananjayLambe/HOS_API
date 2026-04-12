# consultations_core/api/serializers/instructions.py
from rest_framework import serializers
from consultations_core.models.instruction import (
    InstructionCategory,
    InstructionTemplate,
    InstructionTemplateVersion,
    SpecialtyInstructionMapping,
    EncounterInstruction,
)


class InstructionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructionCategory
        fields = ["id", "code", "name", "display_order"]


class InstructionTemplateListSerializer(serializers.ModelSerializer):
    category_code = serializers.CharField(source="category.code", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    display_order = serializers.SerializerMethodField()

    class Meta:
        model = InstructionTemplate
        fields = [
            "id",
            "key",
            "label",
            "category_code",
            "category_name",
            "requires_input",
            "input_schema",
            "display_order",
        ]

    def get_display_order(self, obj):
        mapping = getattr(obj, "_mapping_display_order", None)
        return mapping if mapping is not None else 0


class InstructionTemplatesResponseSerializer(serializers.Serializer):
    categories = InstructionCategorySerializer(many=True)
    templates = InstructionTemplateListSerializer(many=True)


class EncounterInstructionSerializer(serializers.ModelSerializer):
    instruction_template_id = serializers.UUIDField(source="instruction_template.id", read_only=True)
    label = serializers.CharField(source="instruction_template.label", read_only=True)

    class Meta:
        model = EncounterInstruction
        fields = [
            "id",
            "instruction_template_id",
            "label",
            "input_data",
            "custom_note",
            "is_active",
        ]
        read_only_fields = ["id", "instruction_template_id", "label"]


class AddInstructionSerializer(serializers.Serializer):
    instruction_template_id = serializers.UUIDField()
    input_data = serializers.JSONField(required=False, default=dict)
    custom_note = serializers.CharField(required=False, allow_blank=True, default="")


class UpdateInstructionSerializer(serializers.Serializer):
    input_data = serializers.JSONField(required=False)
    custom_note = serializers.CharField(required=False, allow_blank=True)


class InstructionSuggestionQuerySerializer(serializers.Serializer):
    """Query params for GET /instructions/suggestions/."""

    q = serializers.CharField(required=False, allow_blank=True, default="")
    specialty = serializers.CharField(required=False, allow_blank=True, default="")
    category = serializers.CharField(required=False, allow_blank=True, default="")
    limit = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)
    exclude = serializers.ListField(
        child=serializers.CharField(allow_blank=False),
        required=False,
    )
