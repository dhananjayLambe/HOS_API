"""Configurable throttling for Support Investigation APIs."""

from rest_framework.throttling import SimpleRateThrottle
from django.conf import settings


class _SupportRateThrottle(SimpleRateThrottle):
    scope = "support_lookup"

    def get_rate(self):
        mapping = {
            "support_search": getattr(settings, "SUPPORT_SEARCH_RATE", "60/min"),
            "support_lookup": getattr(settings, "SUPPORT_LOOKUP_RATE", "120/min"),
            "support_timeline": getattr(settings, "SUPPORT_TIMELINE_RATE", "120/min"),
        }
        return mapping.get(self.scope, "120/min")

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class SupportSearchThrottle(_SupportRateThrottle):
    scope = "support_search"


class SupportLookupThrottle(_SupportRateThrottle):
    scope = "support_lookup"


class SupportTimelineThrottle(_SupportRateThrottle):
    scope = "support_timeline"
