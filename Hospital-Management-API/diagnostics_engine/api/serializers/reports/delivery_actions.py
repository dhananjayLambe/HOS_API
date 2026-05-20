"""Request/response serializers for report delivery operational actions."""

import re

from rest_framework import serializers

_ALLOWED_CHANNELS = frozenset({"WHATSAPP"})
_PHONE_SHAPE_RE = re.compile(r"^[\d\s+\-()]+$")


class MarkReadyRequestSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class SendWhatsAppRequestSerializer(serializers.Serializer):
    recipient_phone = serializers.CharField(max_length=20)
    channel = serializers.CharField(max_length=30, default="WHATSAPP", required=False)

    def validate_recipient_phone(self, value):
        normalized = (value or "").strip()
        if not normalized:
            raise serializers.ValidationError("Recipient phone is required.")
        if not _PHONE_SHAPE_RE.match(normalized):
            raise serializers.ValidationError("Phone must contain only digits and separators.")
        digits = re.findall(r"\d", normalized)
        if len(digits) < 10 or len(digits) > 15:
            raise serializers.ValidationError("Phone must contain 10–15 digits.")
        return normalized

    def validate_channel(self, value):
        channel = (value or "WHATSAPP").strip().upper()
        if channel not in _ALLOWED_CHANNELS:
            raise serializers.ValidationError(f"Unsupported channel: {value}")
        return channel


class MarkReadyResponseSerializer(serializers.Serializer):
    report_id = serializers.UUIDField()
    status = serializers.CharField()
    available_actions = serializers.ListField(child=serializers.CharField())


class SendWhatsAppResponseSerializer(serializers.Serializer):
    report_id = serializers.UUIDField()
    delivery_status = serializers.CharField()
    delivery_log_id = serializers.UUIDField()
    channel = serializers.CharField()
    available_actions = serializers.ListField(child=serializers.CharField())


class RetryDeliveryResponseSerializer(serializers.Serializer):
    new_delivery_log_id = serializers.UUIDField()
    parent_delivery_log_id = serializers.UUIDField()
    status = serializers.CharField()
