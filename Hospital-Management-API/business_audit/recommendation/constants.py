"""Constants for recommendation business audit."""

from django.conf import settings

MARKETPLACE_NAME = "DoctorPro Marketplace"

STAGE_GENERATION = "generation"
STAGE_MARKETPLACE = "marketplace"
STAGE_DELIVERY = "delivery"

DOMAIN_DIAGNOSTICS = "diagnostics_engine"
DOMAIN_NOTIFICATIONS = "notifications"

SERVICE_LAB_RECOMMENDATION = "LabRecommendationService"
SERVICE_MARKETPLACE_API = "MarketplaceRecommendationView"
SERVICE_WHATSAPP = "WhatsAppService"
SERVICE_EXPIRATION = "RecommendationExpirationService"

OPERATION_RECOMMEND = "recommend"
OPERATION_POST_RECOMMENDATION = "post_recommendation"
OPERATION_PREPARE_DELIVERY = "prepare_recommendation_delivery"
OPERATION_SEND_MESSAGE = "send_recommendation_message"
OPERATION_WEBHOOK_STATUS = "process_webhook_status"
OPERATION_EXPIRE = "expire_stale_recommendations"

SOURCE_PATH_MARKETPLACE_API = "marketplace_api"
SOURCE_PATH_WHATSAPP_ORCHESTRATOR = "whatsapp_orchestrator"

RECOMMENDATION_ENGINE_VERSION = getattr(settings, "APPLICATION_VERSION", "0.0.0")

DOWNSTREAM_GENERATION = ["LabRecommendationService", "EligibilityEngine", "RankingEngine"]
DOWNSTREAM_MARKETPLACE = ["MarketplaceRecommendationView", "LabRecommendationService"]
DOWNSTREAM_DELIVERY = ["WhatsAppService", "Meta"]
