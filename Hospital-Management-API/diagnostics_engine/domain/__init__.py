# diagnostics_engine.domain — cross-cutting rules, invariants, and coordination helpers

from diagnostics_engine.domain.cancellation import CancellationService
from diagnostics_engine.domain.fulfillment import FulfillmentValidationService
from diagnostics_engine.domain.investigation_resolution import (
    derive_sample_collection_mode,
    extract_required_service_ids,
    load_convertible_investigation_items,
    normalize_package_composition,
)
from diagnostics_engine.domain.order_creation import DiagnosticOrderCreationResult, DiagnosticOrderCreationService
from diagnostics_engine.domain.order_status import OrderStatusAggregationService
from diagnostics_engine.domain.package_orders import (
    build_composition_snapshot,
    ensure_test_lines_for_test_items,
    expand_confirmed_order_packages,
)
from diagnostics_engine.domain.pricing import PricingQuoteService
from diagnostics_engine.domain.recommendation import LabRecommendationService, RecommendationResult

__all__ = [
    "CancellationService",
    "DiagnosticOrderCreationResult",
    "DiagnosticOrderCreationService",
    "FulfillmentValidationService",
    "LabRecommendationService",
    "OrderStatusAggregationService",
    "PricingQuoteService",
    "RecommendationResult",
    "build_composition_snapshot",
    "derive_sample_collection_mode",
    "expand_confirmed_order_packages",
    "ensure_test_lines_for_test_items",
    "extract_required_service_ids",
    "load_convertible_investigation_items",
    "normalize_package_composition",
]
