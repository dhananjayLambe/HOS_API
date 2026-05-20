"""Delivery request/response serializers."""

from rest_framework import serializers

from labs.models.lab_tracking import LabReportDeliveryLog


class PrepareDeliveryRequestSerializer(serializers.Serializer):
    recipient_phone = serializers.CharField(max_length=20)
    channel = serializers.CharField(max_length=30, default="WHATSAPP", required=False)


class DeliveryLogSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source="delivery_status")

    class Meta:
        model = LabReportDeliveryLog
        fields = [
            "id",
            "status",
            "sent_at",
            "delivered_at",
            "failure_reason",
            "retry_count",
        ]
        read_only_fields = fields
