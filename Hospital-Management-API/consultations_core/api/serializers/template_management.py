from rest_framework import serializers

from consultations_core.models.clinical_templates import ClinicalTemplate

CATEGORY_TO_CONSULTATION_TYPE = {
    "full_consultation": "FULL",
    "quick_prescription": "QUICK_RX",
    "test_only": "TEST_ONLY",
}

CONSULTATION_TYPE_TO_CATEGORY = {
    "FULL": "full_consultation",
    "QUICK_RX": "quick_prescription",
    "TEST_ONLY": "test_only",
}


def consultation_type_to_category(consultation_type: str) -> str:
    return CONSULTATION_TYPE_TO_CATEGORY.get(consultation_type, "full_consultation")


class TemplateListSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    usage_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ClinicalTemplate
        fields = ("id", "name", "category", "usage_count", "updated_at")

    def get_category(self, obj):
        return consultation_type_to_category(obj.consultation_type)


class TemplateDetailSerializer(TemplateListSerializer):
    class Meta(TemplateListSerializer.Meta):
        fields = TemplateListSerializer.Meta.fields + ("template_data",)
        read_only_fields = ("id", "usage_count", "updated_at")

    def validate_name(self, value):
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("This field may not be blank.")
        return name

    def validate_template_data(self, value):
        if value is None or value == {}:
            raise serializers.ValidationError("Template data must not be empty.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if request is None or not hasattr(request.user, "doctor"):
            return attrs

        name = attrs.get("name")
        if name is None and self.instance is not None:
            name = self.instance.name
        if name is not None:
            qs = ClinicalTemplate.objects.filter(
                doctor=request.user.doctor,
                name=name.strip(),
                is_active=True,
            )
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "name": [
                            "A clinical template with this name already exists for this doctor."
                        ]
                    }
                )
        return attrs
