from rest_framework import serializers


class InvestigationSuggestionsQuerySerializer(serializers.Serializer):
    encounter_id = serializers.UUIDField(required=True)


class SelectedTestSerializer(serializers.Serializer):
    id = serializers.CharField()


class SuggestedTestSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    score = serializers.FloatField()
    confidence = serializers.FloatField()
    confidence_label = serializers.CharField()
    reason = serializers.CharField()
    badges = serializers.ListField(child=serializers.CharField(), allow_empty=True)


class SuggestedPackageSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    completion = serializers.CharField()
    missing_tests = serializers.ListField(child=serializers.CharField(), allow_empty=True)


class PopularPackageSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()


class InvestigationSuggestionsResponseSerializer(serializers.Serializer):
    engine_version = serializers.CharField()
    selected_tests = SelectedTestSerializer(many=True)
    common_tests = SuggestedTestSerializer(many=True)
    recommended_tests = SuggestedTestSerializer(many=True)
    recommended_packages = SuggestedPackageSerializer(many=True)
    popular_packages = PopularPackageSerializer(many=True)
