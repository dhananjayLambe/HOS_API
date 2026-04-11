from rest_framework import serializers

from diagnostics_engine.services.search.utils import validate_query


class InvestigationSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=True, allow_blank=True)
    type = serializers.ChoiceField(choices=["all", "test", "package"], default="all")
    limit = serializers.IntegerField(default=10, min_value=1, max_value=20)

    def validate(self, attrs):
        normalized, err = validate_query(attrs.get("q"))
        if err:
            raise serializers.ValidationError({"q": [err]})
        attrs["q_normalized"] = normalized
        return attrs
