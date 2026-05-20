"""Upload request shape validation only."""

from rest_framework import serializers

from diagnostics_engine.domain.reports import upload_rules


class UploadArtifactRequestSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.FileField(),
        allow_empty=False,
        max_length=upload_rules.DEFAULT_MAX_REPORT_UPLOAD_FILES,
    )
    primary_file_index = serializers.IntegerField(required=False, min_value=0)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    version = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        files = attrs.get("files") or []
        index = attrs.get("primary_file_index")
        if index is not None and index >= len(files):
            raise serializers.ValidationError(
                {"primary_file_index": "Index out of range for uploaded files."}
            )
        return attrs
