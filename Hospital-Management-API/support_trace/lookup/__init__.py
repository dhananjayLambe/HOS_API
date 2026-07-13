"""Support Investigation Engine — canonical production investigation layer."""

from support_trace.lookup.enums import InvestigationLevel
from support_trace.lookup.investigation_policy import InvestigationOptions, InvestigationPolicy
from support_trace.lookup.lookup_service import TraceLookupService

__all__ = ["TraceLookupService", "InvestigationLevel", "InvestigationOptions", "InvestigationPolicy"]
