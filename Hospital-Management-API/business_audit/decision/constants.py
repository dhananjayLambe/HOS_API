"""Generic decision audit constants."""

from django.conf import settings

# Generic FSM state labels (domain-specific packages map events to these)
DECISION_STATE_STARTED = "Started"
DECISION_STATE_RULE_EVALUATED = "RuleEvaluated"
DECISION_STATE_MATCHED = "Matched"
DECISION_STATE_COMPARED = "Compared"
DECISION_STATE_DISCOUNTED = "Discounted"
DECISION_STATE_ASSIGNED = "Assigned"
DECISION_STATE_FAILED = "Failed"

DEFAULT_RULE_ID = "hybrid_scoring_v1"
DEFAULT_ENGINE_VERSION = getattr(settings, "APPLICATION_VERSION", "0.0.0")

CONFIDENCE_MAP = {
    "high": 0.9,
    "medium": 0.7,
    "low": 0.4,
}
