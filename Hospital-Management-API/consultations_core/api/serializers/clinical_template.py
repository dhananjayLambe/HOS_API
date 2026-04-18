from rest_framework import serializers

from consultations_core.models.clinical_templates import ClinicalTemplate


class ClinicalTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalTemplate
        fields = (
            "id",
            "name",
            "consultation_type",
            "template_data",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

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
        if name is not None and self.instance is None:
            exists = ClinicalTemplate.objects.filter(
                doctor=request.user.doctor,
                name=name.strip(),
            ).exists()
            if exists:
                raise serializers.ValidationError(
                    {
                        "name": [
                            "A clinical template with this name already exists for this doctor."
                        ]
                    }
                )
        return attrs
