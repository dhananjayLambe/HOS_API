"""Payload builders for recommendation business audit events."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from business_audit.recommendation.constants import (
    MARKETPLACE_NAME,
    RECOMMENDATION_ENGINE_VERSION,
    STAGE_DELIVERY,
    STAGE_GENERATION,
    STAGE_MARKETPLACE,
)
from shared.audit.sanitization import sanitize_audit_payload


class RecommendationPayloadBuilder:
    """Builds sanitized operational payloads for recommendation audit events."""

    @staticmethod
    def _base_context(
        *,
        recommendation_id: str,
        consultation_id: str,
        patient_account_id: str | None,
        patient_profile_id: str | None,
        encounter_id: str | None,
        operational_stage: str,
        downstream_systems: list[str],
        **extra: Any,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "operational_stage": operational_stage,
            "recommendation_id": str(recommendation_id),
            "consultation_id": str(consultation_id),
            "patient_account_id": patient_account_id,
            "patient_profile_id": patient_profile_id,
            "encounter_id": encounter_id,
            "recommendation_engine_version": RECOMMENDATION_ENGINE_VERSION,
            "downstream_systems": downstream_systems,
        }
        payload.update({k: v for k, v in extra.items() if v is not None})
        return sanitize_audit_payload(payload)

    @classmethod
    def build_generated(
        cls,
        *,
        recommendation_id: str,
        consultation_id: str,
        patient_account_id: str | None,
        patient_profile_id: str | None,
        encounter_id: str | None,
        result,
        source_path: str,
        marketplace: str = MARKETPLACE_NAME,
        expires_at: str | None = None,
    ) -> dict[str, Any]:
        stage = STAGE_MARKETPLACE if source_path == "marketplace_api" else STAGE_GENERATION
        downstream = (
            ["MarketplaceRecommendationView", "LabRecommendationService"]
            if stage == STAGE_MARKETPLACE
            else ["LabRecommendationService", "EligibilityEngine", "RankingEngine"]
        )
        tests = []
        packages = []
        package_count = 0
        laboratory_id = None
        branch_id = None
        quoted_price = None
        collection_mode = None
        failure_reason = None
        available = False

        if result is not None:
            available = bool(getattr(result, "available", False))
            failure_reason = getattr(result, "failure_reason", None)
            collection_mode = getattr(result, "collection_mode", None)
            quoted_price = cls._decimal_str(getattr(result, "quoted_price", None))
            lab = getattr(result, "recommended_lab", None)
            branch = getattr(result, "recommended_branch", None)
            laboratory_id = str(lab.pk) if lab is not None else None
            branch_id = str(branch.pk) if branch is not None else None
            for test in getattr(result, "expanded_tests", None) or []:
                tests.append(getattr(test, "name", None) or getattr(test, "code", ""))
            for package in getattr(result, "packages", None) or []:
                packages.append(getattr(package, "name", None) or getattr(package, "code", ""))
            package_count = len(packages)

        return cls._base_context(
            recommendation_id=recommendation_id,
            consultation_id=consultation_id,
            patient_account_id=patient_account_id,
            patient_profile_id=patient_profile_id,
            encounter_id=encounter_id,
            operational_stage=stage,
            downstream_systems=downstream,
            marketplace=marketplace,
            source_path=source_path,
            available=available,
            failure_reason=failure_reason,
            laboratory_id=laboratory_id,
            branch_id=branch_id,
            package_count=package_count,
            recommended_tests=tests,
            recommended_packages=packages,
            quoted_price=quoted_price,
            collection_mode=collection_mode,
            expires_at=expires_at,
        )

    @classmethod
    def build_queued(
        cls,
        *,
        recommendation_id: str,
        consultation_id: str,
        patient_account_id: str | None,
        patient_profile_id: str | None,
        encounter_id: str | None,
        whatsapp_message_id: str,
        variant: str | None = None,
        recommendation_metadata: dict | None = None,
    ) -> dict[str, Any]:
        extra: dict[str, Any] = {
            "whatsapp_message_id": str(whatsapp_message_id),
            "variant": variant,
        }
        if recommendation_metadata:
            extra["expires_at"] = recommendation_metadata.get("expires_at")
        return cls._base_context(
            recommendation_id=recommendation_id,
            consultation_id=consultation_id,
            patient_account_id=patient_account_id,
            patient_profile_id=patient_profile_id,
            encounter_id=encounter_id,
            operational_stage=STAGE_DELIVERY,
            downstream_systems=["WhatsAppService"],
            **extra,
        )

    @classmethod
    def build_sent(
        cls,
        *,
        recommendation_id: str,
        consultation_id: str,
        patient_account_id: str | None,
        patient_profile_id: str | None,
        encounter_id: str | None,
        whatsapp_message_id: str,
        meta_message_id: str,
        variant: str | None = None,
        template_name: str | None = None,
        execution_time_ms: int | None = None,
    ) -> dict[str, Any]:
        return cls._base_context(
            recommendation_id=recommendation_id,
            consultation_id=consultation_id,
            patient_account_id=patient_account_id,
            patient_profile_id=patient_profile_id,
            encounter_id=encounter_id,
            operational_stage=STAGE_DELIVERY,
            downstream_systems=["WhatsAppService", "Meta"],
            whatsapp_message_id=str(whatsapp_message_id),
            meta_message_id=meta_message_id,
            variant=variant,
            template_name=template_name,
            execution_time_ms=execution_time_ms,
        )

    @classmethod
    def build_delivery_status(
        cls,
        *,
        recommendation_id: str,
        consultation_id: str,
        patient_account_id: str | None,
        patient_profile_id: str | None,
        encounter_id: str | None,
        whatsapp_message_id: str,
        meta_message_id: str,
        provider_status: str,
        template_name: str | None = None,
    ) -> dict[str, Any]:
        return cls._base_context(
            recommendation_id=recommendation_id,
            consultation_id=consultation_id,
            patient_account_id=patient_account_id,
            patient_profile_id=patient_profile_id,
            encounter_id=encounter_id,
            operational_stage=STAGE_DELIVERY,
            downstream_systems=["Meta", "WhatsAppService"],
            whatsapp_message_id=str(whatsapp_message_id),
            meta_message_id=meta_message_id,
            provider_status=provider_status,
            template_name=template_name,
        )

    @classmethod
    def build_failed(
        cls,
        *,
        recommendation_id: str,
        consultation_id: str,
        patient_account_id: str | None,
        patient_profile_id: str | None,
        encounter_id: str | None,
        whatsapp_message_id: str | None,
        failure_reason: str,
        provider_response_code: str | None = None,
        meta_message_id: str | None = None,
        prior_status: str | None = None,
    ) -> dict[str, Any]:
        return cls._base_context(
            recommendation_id=recommendation_id,
            consultation_id=consultation_id,
            patient_account_id=patient_account_id,
            patient_profile_id=patient_profile_id,
            encounter_id=encounter_id,
            operational_stage=STAGE_DELIVERY,
            downstream_systems=["WhatsAppService", "Meta"],
            whatsapp_message_id=str(whatsapp_message_id) if whatsapp_message_id else None,
            meta_message_id=meta_message_id,
            failure_reason=failure_reason,
            provider_response_code=provider_response_code,
            prior_status=prior_status,
        )

    @classmethod
    def build_retried(
        cls,
        *,
        recommendation_id: str,
        consultation_id: str,
        patient_account_id: str | None,
        patient_profile_id: str | None,
        encounter_id: str | None,
        whatsapp_message_id: str | None,
        retry_count: int,
        retry_reason: str | None,
        prior_status: str | None,
        prior_retry_count: int | None,
    ) -> dict[str, Any]:
        return cls._base_context(
            recommendation_id=recommendation_id,
            consultation_id=consultation_id,
            patient_account_id=patient_account_id,
            patient_profile_id=patient_profile_id,
            encounter_id=encounter_id,
            operational_stage=STAGE_DELIVERY,
            downstream_systems=["WhatsAppService", "Celery"],
            whatsapp_message_id=str(whatsapp_message_id) if whatsapp_message_id else None,
            retry_count=retry_count,
            retry_reason=retry_reason,
            prior_status=prior_status,
            prior_retry_count=prior_retry_count,
        )

    @classmethod
    def build_expired(
        cls,
        *,
        recommendation_id: str,
        consultation_id: str,
        patient_account_id: str | None,
        patient_profile_id: str | None,
        encounter_id: str | None,
        expires_at: str,
        whatsapp_message_id: str | None = None,
        message_status: str | None = None,
    ) -> dict[str, Any]:
        return cls._base_context(
            recommendation_id=recommendation_id,
            consultation_id=consultation_id,
            patient_account_id=patient_account_id,
            patient_profile_id=patient_profile_id,
            encounter_id=encounter_id,
            operational_stage=STAGE_DELIVERY,
            downstream_systems=["RecommendationExpirationService"],
            expires_at=expires_at,
            whatsapp_message_id=str(whatsapp_message_id) if whatsapp_message_id else None,
            message_status=message_status,
        )

    @staticmethod
    def _decimal_str(value: Decimal | None) -> str | None:
        if value is None:
            return None
        return str(value)
