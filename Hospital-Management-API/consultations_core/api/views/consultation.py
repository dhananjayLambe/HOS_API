"""
Consultation-specific API views.

This module owns consultation section endpoints (findings/diagnosis/etc. persistence
at end consultation), separated from pre-consultation views for clearer boundaries.
"""

from consultations_core.api.views.preconsultation import (
    EndConsultationAPIView as _EndConsultationAPIView,
)


class EndConsultationAPIView(_EndConsultationAPIView):
    """Consultation completion endpoint (consultation section persistence)."""

