"""Audit trail for Marketplace Recommendation API calls (no PII)."""

from __future__ import annotations

from django.db import models

from core.models import BaseModel


class MarketplaceRecommendationApiAudit(BaseModel):
    recommendation_id = models.UUIDField(db_index=True)
    request_id = models.CharField(max_length=128, db_index=True)
    client_request_id = models.CharField(max_length=128, blank=True, default="")

    consultation_id = models.UUIDField(db_index=True)
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    user_role_snapshot = models.CharField(max_length=64, blank=True, default="")

    http_status = models.PositiveSmallIntegerField()
    available = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=64, blank=True, default="")

    duration_ms = models.PositiveIntegerField(default=0)
    query_count = models.PositiveIntegerField(null=True, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default="")

    class Meta:
        db_table = "diagnostics_marketplace_recommendation_api_audit"
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["consultation_id", "created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"RecommendationAudit {self.recommendation_id} consultation={self.consultation_id}"
