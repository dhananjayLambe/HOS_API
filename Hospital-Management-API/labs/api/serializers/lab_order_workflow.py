"""Serializers for lab order accept/reject workflow APIs."""

from rest_framework import serializers


class LabOrderRejectRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True)
